"""Local, read-only mailbox connector for Mail Trail (Python 3.10+, no packages).

Run from any directory: python projects/006-leak-check/runtime/mail_service.py
Mail and app authorization codes stay in memory; no telemetry or request logging.
This is a loopback development service, not a public multi-user deployment.
"""

from __future__ import annotations

import argparse
import base64
from dataclasses import dataclass, field
import hmac
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import imaplib
import json
from pathlib import Path
import re
import secrets
import ssl
import threading
import time
from urllib.parse import parse_qs, urlsplit


PROVIDERS = (
    {"id": "qq", "name": "QQ / Foxmail 邮箱", "domains": ["qq.com", "foxmail.com"], "host": "imap.qq.com"},
    {"id": "163", "name": "网易 163 邮箱", "domains": ["163.com"], "host": "imap.163.com"},
    {"id": "126", "name": "网易 126 邮箱", "domains": ["126.com"], "host": "imap.126.com"},
    {"id": "yeah", "name": "网易 Yeah 邮箱", "domains": ["yeah.net"], "host": "imap.yeah.net"},
)
ALLOWED_LIMITS = (100, 500, 1000, 3000)
MAX_MESSAGE_BYTES = 2 * 1024 * 1024
MAX_TOTAL_BYTES = 25 * 1024 * 1024
SOCKET_TIMEOUT = 20
JOB_TTL = 600
MAX_JOBS = 3
MAX_BODY_BYTES = 4096
API_PREFIX = "/api/mail-trail/"
DEFAULT_WEB_ROOT = Path(__file__).resolve().parents[3] / "web"


class RequestError(ValueError):
    """An error whose fixed message is safe to return to the browser."""


def validate_scan(data):
    if not isinstance(data, dict):
        raise RequestError("请求格式错误。")
    email = data.get("email", "")
    code = data.get("authorizationCode", "")
    limit = data.get("limit", 500)
    if not isinstance(email, str) or len(email) > 254:
        raise RequestError("请填写有效邮箱地址。")
    email = email.strip()
    if not re.fullmatch(r"[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9.-]+", email):
        raise RequestError("请填写有效邮箱地址。")
    local, domain = email.rsplit("@", 1)
    domain = domain.lower()
    if len(local) > 64 or local.startswith(".") or local.endswith(".") or ".." in local:
        raise RequestError("请填写有效邮箱地址。")
    provider = next((p for p in PROVIDERS if domain in p["domains"]), None)
    if provider is None:
        raise RequestError("当前支持 QQ、Foxmail、163、126 和 Yeah 邮箱。")
    if not isinstance(code, str) or not re.fullmatch(r"[\x21-\x7e]{6,256}", code):
        raise RequestError("请填写邮箱设置中生成的客户端授权码。")
    if type(limit) is not int or limit not in ALLOWED_LIMITS:
        raise RequestError("请选择支持的邮件检查数量。")
    return f"{local}@{domain}", code, limit, provider


class BoundedIMAP4SSL(imaplib.IMAP4_SSL):
    """Reject unexpectedly large literals even if preflight size was incorrect."""

    def read(self, size):
        if size > MAX_MESSAGE_BYTES:
            raise imaplib.IMAP4.error("Mailbox message exceeds local limit")
        return super().read(size)


@dataclass
class ScanJob:
    email: str
    limit: int
    id: str = field(default_factory=lambda: secrets.token_urlsafe(24))
    created: float = field(default_factory=time.monotonic)
    finished: float | None = None
    status: str = "running"
    scanned: int = 0
    total: int = 0
    skipped: int = 0
    warnings: list = field(default_factory=list)
    messages: list = field(default_factory=list)
    error: str | None = None
    stop: threading.Event = field(default_factory=threading.Event, repr=False)
    worker_done: threading.Event = field(default_factory=threading.Event, repr=False)
    lock: threading.Lock = field(default_factory=threading.Lock, repr=False)

    def snapshot(self):
        with self.lock:
            result = {"jobId": self.id, "status": self.status, "scanned": self.scanned,
                      "total": self.total, "skipped": self.skipped,
                      "warnings": list(self.warnings), "email": self.email,
                      "scope": "INBOX", "limit": self.limit,
                      "disconnected": self.worker_done.is_set()}
            if self.error:
                result["error"] = self.error
            if self.status == "complete":
                result["messages"] = list(self.messages)
            return result

    def cancel(self):
        self.stop.set()
        with self.lock:
            self.status = "cancelled"
            self.messages.clear()
            self.finished = time.monotonic()

    def warning(self, text):
        with self.lock:
            if text not in self.warnings:
                self.warnings.append(text)


def _is_ok(status):
    return status in ("OK", b"OK")


def _fetch_size(parts):
    for part in parts or []:
        value = part[0] if isinstance(part, tuple) else part
        if isinstance(value, bytes):
            found = re.search(rb"\bRFC822\.SIZE\s+(\d+)\b", value, re.I)
            if found:
                return int(found.group(1))
    return None


def _fetch_body(parts):
    for part in parts or []:
        if isinstance(part, tuple) and len(part) == 2 and isinstance(part[1], bytes):
            return part[1]
    return None


def scan_mailbox(job, authorization_code, provider, imap_factory=BoundedIMAP4SSL):
    """Read newest INBOX messages. The injected factory enables offline tests."""
    # A mutable one-use envelope prevents Thread._args retaining the code.
    if isinstance(authorization_code, list):
        authorization_code = authorization_code.pop()
    client = None
    collected = []
    completed = False
    used_bytes = 0
    deadline = job.created + JOB_TTL

    def stopped():
        if time.monotonic() >= deadline:
            job.warning("检查达到 10 分钟时限，请缩小范围后重试。")
            job.cancel()
        return job.stop.is_set()

    def skip(reason):
        with job.lock:
            if job.status == "running":
                job.skipped += 1
        job.warning(reason)

    try:
        if stopped():
            return
        client = imap_factory(provider["host"], port=993,
                              ssl_context=ssl.create_default_context(), timeout=SOCKET_TIMEOUT)
        if stopped():
            return
        status, _ = client.login(job.email, authorization_code)
        authorization_code = ""
        if not _is_ok(status):
            raise imaplib.IMAP4.error("Authentication failed")
        if stopped():
            return
        if provider["id"] in ("163", "126", "yeah") and b"ID" in getattr(client, "capabilities", ()):
            # Identify this client honestly when NetEase advertises RFC 2971.
            status, _ = client.xatom("ID", '("name" "MailTrail" "version" "0.1")')
            if not _is_ok(status):
                raise imaplib.IMAP4.error("Client identification failed")
        status, _ = client.select("INBOX", readonly=True)
        if not _is_ok(status):
            raise imaplib.IMAP4.error("Inbox unavailable")
        status, data = client.uid("SEARCH", None, "ALL")
        if not _is_ok(status):
            raise imaplib.IMAP4.error("Search failed")
        raw_ids = b" ".join(x for x in data or [] if isinstance(x, bytes)).split()
        if any(not re.fullmatch(rb"[1-9][0-9]*", uid) for uid in raw_ids):
            raise imaplib.IMAP4.error("Invalid identifiers")
        ids = sorted(set(raw_ids), key=int)
        if len(ids) > job.limit:
            job.warning(f"收件箱共有 {len(ids)} 封邮件，本次仅检查最近 {job.limit} 封。")
        ids = ids[-job.limit:][::-1]
        with job.lock:
            job.total = len(ids)
        job.warning("仅检查收件箱；归档、自建文件夹、已删除邮件不在本次范围内。")
        for uid in ids:
            if stopped():
                return
            status, parts = client.uid("FETCH", uid.decode("ascii"), "(RFC822.SIZE)")
            size = _fetch_size(parts) if _is_ok(status) else None
            with job.lock:
                if job.status == "running":
                    job.scanned += 1
            if size is None:
                skip("部分邮件无法读取大小，已跳过。")
                continue
            if size > MAX_MESSAGE_BYTES:
                skip("已跳过超过 2 MB 的邮件，可能遗漏其中的账号线索。")
                continue
            if size > MAX_TOTAL_BYTES - used_bytes:
                skip("已达到本次 25 MB 的邮件读取预算，部分邮件已跳过。")
                continue
            if stopped():
                return
            status, parts = client.uid("FETCH", uid.decode("ascii"), "(BODY.PEEK[])")
            raw = _fetch_body(parts) if _is_ok(status) else None
            if raw is None:
                skip("部分邮件读取失败，已跳过。")
                continue
            if len(raw) > MAX_MESSAGE_BYTES or len(raw) > MAX_TOTAL_BYTES - used_bytes:
                skip("部分邮件实际大小超过读取预算，已跳过。")
                continue
            used_bytes += len(raw)
            collected.append({"fileName": f"inbox-{uid.decode('ascii')}.eml",
                              "raw": base64.b64encode(raw).decode("ascii")})
            raw = None
        if stopped():
            return
        completed = True
    except Exception:
        # Provider messages may contain mailbox identifiers or credentials.
        # Never return, print or persist those exceptions.
        with job.lock:
            if job.status == "running":
                job.status = "failed"
                job.error = "邮箱连接或读取失败。请确认已开启 IMAP、使用客户端授权码，并检查网络或邮箱安全提示。"
                job.messages.clear()
                job.finished = time.monotonic()
    finally:
        authorization_code = ""
        if not completed or job.stop.is_set():
            collected.clear()
        if client is not None:
            try:
                client.logout()
            except Exception:
                # IMAP4.logout() does not reach shutdown() if its command fails.
                try:
                    client.shutdown()
                except Exception:
                    pass
            finally:
                # Close local resources even if a provider or shutdown misbehaves.
                for resource_name in ("file", "sock"):
                    resource = getattr(client, resource_name, None)
                    if resource is not None:
                        try:
                            resource.close()
                        except Exception:
                            pass
            client = None
        # Publish success only after the transport is released. Cancellation
        # remains visible immediately while a blocking operation is unwinding.
        with job.lock:
            job.worker_done.set()
            if completed and job.status == "running" and not job.stop.is_set():
                job.messages = collected
                collected = []
                job.status = "complete"
                job.finished = time.monotonic()
        collected.clear()


class JobManager:
    def __init__(self, imap_factory=BoundedIMAP4SSL, start_cleanup=True):
        self.jobs = {}
        self.lock = threading.Lock()
        self.imap_factory = imap_factory
        self.stopping = threading.Event()
        if start_cleanup:
            threading.Thread(target=self._cleanup_loop, daemon=True).start()

    def _cleanup_loop(self):
        while not self.stopping.wait(5):
            self.cleanup()

    def cleanup(self):
        now = time.monotonic()
        with self.lock:
            for job_id, job in list(self.jobs.items()):
                if now - (job.finished or job.created) >= JOB_TTL:
                    job.cancel()
                    del self.jobs[job_id]

    def start(self, data):
        email, code, limit, provider = validate_scan(data)
        self.cleanup()
        with self.lock:
            if any(not j.worker_done.is_set() for j in self.jobs.values()):
                raise RequestError("已有邮箱正在检查或断开连接，请稍后重试。")
            if len(self.jobs) >= MAX_JOBS:
                oldest = min(self.jobs.values(), key=lambda j: j.created)
                oldest.cancel()
                del self.jobs[oldest.id]
            job = ScanJob(email=email, limit=limit)
            self.jobs[job.id] = job
            threading.Thread(target=scan_mailbox,
                             args=(job, [code], provider, self.imap_factory), daemon=True).start()
        code = ""
        return job.id

    def get(self, job_id):
        self.cleanup()
        with self.lock:
            return self.jobs.get(job_id)

    def close(self):
        self.stopping.set()
        with self.lock:
            for job in self.jobs.values():
                job.cancel()
            self.jobs.clear()


class MailTrailServer(ThreadingHTTPServer):
    daemon_threads = True

    def __init__(self, port=5196, web_root=DEFAULT_WEB_ROOT, manager=None):
        self.web_root = Path(web_root).resolve()
        self.manager = manager or JobManager()
        self.token = secrets.token_urlsafe(32)
        super().__init__(("127.0.0.1", port), MailTrailHandler)

    def server_close(self):
        self.manager.close()
        super().server_close()

    def handle_error(self, request, client_address):
        pass  # Never print request-associated traceback data.


class MailTrailHandler(SimpleHTTPRequestHandler):
    server_version = "MailTrailLocal/1"
    sys_version = ""

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(args[2].web_root), **kwargs)

    def setup(self):
        super().setup()
        self.connection.settimeout(SOCKET_TIMEOUT)

    def log_message(self, format, *args):
        pass  # URLs, email addresses and errors must not reach access logs.

    def end_headers(self):
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Referrer-Policy", "no-referrer")
        self.send_header("Cross-Origin-Resource-Policy", "same-origin")
        self.send_header("X-Frame-Options", "DENY")
        if self.path.startswith(API_PREFIX):
            self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def _json(self, status, value):
        body = json.dumps(value, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        try:
            self.wfile.write(body)
        except (ConnectionError, TimeoutError):
            pass

    def _same_origin(self):
        port = self.server.server_address[1]
        expected = f"127.0.0.1:{port}"
        hosts = self.headers.get_all("Host", [])
        origins = self.headers.get_all("Origin", [])
        if hosts != [expected] or (origins and origins != [f"http://{expected}"]):
            self._json(403, {"error": "请在本机页面中操作。"})
            return False
        if self.headers.get("Sec-Fetch-Site") not in (None, "same-origin", "none"):
            self._json(403, {"error": "仅允许同源请求。"})
            return False
        return True

    def _authorized(self):
        tokens = self.headers.get_all("X-MailTrail-Token", [])
        if len(tokens) != 1 or not hmac.compare_digest(tokens[0].encode("utf-8"), self.server.token.encode("ascii")):
            self._json(403, {"error": "连接凭证已失效，请刷新页面。"})
            return False
        return True

    def do_GET(self):
        if not self._same_origin():
            return
        parsed = urlsplit(self.path)
        if not parsed.path.startswith(API_PREFIX):
            return super().do_GET()
        if parsed.path == API_PREFIX + "config":
            self.server.manager.cleanup()
            return self._json(200, {"token": self.server.token, "localOnly": True,
                                   "providers": [{k: v for k, v in p.items() if k != "host"} | {"available": True} for p in PROVIDERS]})
        if not self._authorized():
            return
        if parsed.path == API_PREFIX + "status":
            job_id = parse_qs(parsed.query).get("jobId", [""])[0]
            job = self.server.manager.get(job_id)
            return self._json(200, job.snapshot()) if job else self._json(404, {"error": "检查记录已清除，请重新连接。"})
        self._json(404, {"error": "接口不存在。"})

    def do_HEAD(self):
        if self._same_origin():
            if self.path.startswith(API_PREFIX):
                self.send_error(405)
            else:
                super().do_HEAD()

    def do_POST(self):
        if not self._same_origin() or not self._authorized():
            self.close_connection = True
            return
        if self.headers.get_content_type() != "application/json" or self.headers.get("Transfer-Encoding"):
            self.close_connection = True
            return self._json(415, {"error": "请求格式必须为 JSON。"})
        lengths = self.headers.get_all("Content-Length", [])
        if len(lengths) != 1 or not lengths[0].isdigit() or not 0 < int(lengths[0]) <= MAX_BODY_BYTES:
            self.close_connection = True
            return self._json(413, {"error": "请求大小无效。"})
        try:
            data = json.loads(self.rfile.read(int(lengths[0])))
            if not isinstance(data, dict):
                raise RequestError("请求格式错误。")
            path = urlsplit(self.path).path
            if path == API_PREFIX + "scan":
                job_id = self.server.manager.start(data)
                data.clear()
                return self._json(202, {"jobId": job_id})
            if path == API_PREFIX + "cancel":
                job = self.server.manager.get(data.get("jobId", ""))
                if job:
                    job.cancel()
                return self._json(200, {"status": "cancelled"})
            return self._json(404, {"error": "接口不存在。"})
        except RequestError as exc:
            self._json(400, {"error": str(exc)})
        except (ValueError, TypeError, UnicodeError, TimeoutError):
            self._json(400, {"error": "请求格式错误。"})


def main():
    parser = argparse.ArgumentParser(description="Mail Trail local mailbox reader")
    parser.add_argument("--port", type=int, default=5196)
    parser.add_argument("--web-root", type=Path, default=DEFAULT_WEB_ROOT)
    args = parser.parse_args()
    server = MailTrailServer(args.port, args.web_root)
    print(f"Mail Trail: http://127.0.0.1:{server.server_port}/006-leak-check/mail-trail/", flush=True)
    print("Local access only. Mailbox data remains in memory; press Ctrl+C to stop.", flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
