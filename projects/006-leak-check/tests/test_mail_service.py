"""Offline tests only: all mailbox connections use an injected fake IMAP server."""

import base64
import http.client
import importlib.util
import json
from pathlib import Path
import socket
import ssl
import sys
import tempfile
import threading
import time
import unittest
from unittest.mock import patch


MODULE_PATH = Path(__file__).resolve().parents[1] / "runtime" / "mail_service.py"
SPEC = importlib.util.spec_from_file_location("mail_service", MODULE_PATH)
service = importlib.util.module_from_spec(SPEC)
sys.modules[SPEC.name] = service
SPEC.loader.exec_module(service)
QQ = service.PROVIDERS[0]
SECRET = "test-only-authcode"


class FakeIMAP:
    capabilities = (b"IMAP4rev1",)

    def __init__(self, messages=None, sizes=None):
        self.messages = messages if messages is not None else {1: b"Subject: Welcome\r\n\r\nTest"}
        self.sizes = sizes or {}
        self.calls = []
        self.hook = None

    def login(self, email, code):
        self.calls.append(("login", email))
        return "OK", []

    def select(self, mailbox, readonly=False):
        self.calls.append(("select", mailbox, readonly))
        return "OK", [str(len(self.messages)).encode()]

    def uid(self, command, *args):
        self.calls.append((command, *args))
        if self.hook:
            self.hook(command, args)
        if command == "SEARCH":
            return "OK", [b" ".join(str(uid).encode() for uid in self.messages)]
        uid, query = int(args[0]), args[1]
        if query == "(RFC822.SIZE)":
            size = self.sizes.get(uid, len(self.messages[uid]))
            return "OK", [f"1 (UID {uid} RFC822.SIZE {size})".encode()]
        if query == "(BODY.PEEK[])":
            return "OK", [(b"1 (BODY[] {24}", self.messages[uid]), b")"]
        raise AssertionError("Unexpected mailbox command")

    def xatom(self, name, *args):
        self.calls.append((name, *args))
        return "OK", []

    def logout(self):
        self.calls.append(("logout",))
        return "BYE", []


def run_scan(fake, limit=100, provider=QQ):
    job = service.ScanJob("person@qq.com", limit)
    observed = {}

    def factory(host, **kwargs):
        observed.update(host=host, **kwargs)
        return fake

    service.scan_mailbox(job, [SECRET], provider, factory)
    return job, observed


class ScanTests(unittest.TestCase):
    def test_allowlisted_hosts_and_validation(self):
        email, _, limit, provider = service.validate_scan({"email": " person@QQ.COM ", "authorizationCode": SECRET, "limit": 100})
        self.assertEqual((email, limit, provider["host"]), ("person@qq.com", 100, "imap.qq.com"))
        for email in ("person@gmail.com", "person@qq.com.evil.example", "person@127.0.0.1", "p\r\n@qq.com", "p@qq.com:993", "a..b@qq.com"):
            with self.subTest(email=email), self.assertRaises(service.RequestError):
                service.validate_scan({"email": email, "authorizationCode": SECRET})
        for limit in (True, 99, 10000, "100", None):
            with self.subTest(limit=limit), self.assertRaises(service.RequestError):
                service.validate_scan({"email": "p@qq.com", "authorizationCode": SECRET, "limit": limit})
        with self.assertRaises(service.RequestError):
            service.validate_scan({"email": "p@qq.com", "authorizationCode": "abc\r\nsecret"})

    def test_tls_readonly_peek_and_newest_first(self):
        fake = FakeIMAP({1: b"first", 2: b"second"})
        job, connection = run_scan(fake)
        result = job.snapshot()
        self.assertEqual(result["status"], "complete")
        self.assertEqual(result["scanned"], 2)
        self.assertIn(("select", "INBOX", True), fake.calls)
        bodies = [c for c in fake.calls if c[0] == "FETCH" and c[2] == "(BODY.PEEK[])"]
        self.assertEqual(bodies, [("FETCH", "2", "(BODY.PEEK[])"), ("FETCH", "1", "(BODY.PEEK[])")])
        self.assertEqual(base64.b64decode(result["messages"][0]["raw"]), b"second")
        self.assertEqual(connection["host"], "imap.qq.com")
        self.assertEqual(connection["port"], 993)
        self.assertEqual(connection["ssl_context"].verify_mode, ssl.CERT_REQUIRED)
        self.assertTrue(connection["ssl_context"].check_hostname)
        self.assertEqual(connection["timeout"], service.SOCKET_TIMEOUT)
        self.assertEqual(fake.calls[-1], ("logout",))
        self.assertTrue(job.worker_done.is_set())

    def test_latest_limit_is_real(self):
        fake = FakeIMAP({i: b"test" for i in range(1, 151)})
        job, _ = run_scan(fake, limit=100)
        self.assertEqual(job.total, 100)
        self.assertEqual(job.scanned, 100)
        self.assertEqual(job.messages[-1]["fileName"], "inbox-51.eml")
        self.assertTrue(any("150" in warning for warning in job.warnings))

    def test_large_messages_skip_body_fetch(self):
        fake = FakeIMAP({1: b"large", 2: b"small"}, {1: service.MAX_MESSAGE_BYTES + 1})
        job, _ = run_scan(fake)
        self.assertEqual((job.scanned, job.skipped, len(job.messages)), (2, 1, 1))
        self.assertNotIn(("FETCH", "1", "(BODY.PEEK[])"), fake.calls)
        self.assertTrue(any("2 MB" in warning for warning in job.warnings))

    def test_total_budget_skips_remaining_bodies(self):
        fake = FakeIMAP({1: b"123456", 2: b"abcdef", 3: b"tiny"})
        with patch.object(service, "MAX_TOTAL_BYTES", 10):
            job, _ = run_scan(fake)
        self.assertEqual((len(job.messages), job.skipped), (2, 1))
        self.assertNotIn(("FETCH", "1", "(BODY.PEEK[])"), fake.calls)
        self.assertTrue(any("25 MB" in warning for warning in job.warnings))

    def test_actual_size_cannot_bypass_budget(self):
        fake = FakeIMAP({1: b"12345678901"}, {1: 1})
        with patch.object(service, "MAX_TOTAL_BYTES", 10):
            job, _ = run_scan(fake)
        self.assertEqual((job.skipped, job.messages), (1, []))
        client = object.__new__(service.BoundedIMAP4SSL)
        with self.assertRaises(service.imaplib.IMAP4.error):
            client.read(service.MAX_MESSAGE_BYTES + 1)

    def test_cancel_prevents_fetch_and_clears_results(self):
        job = service.ScanJob("person@qq.com", 100)
        fake = FakeIMAP({1: b"one", 2: b"two"})
        fake.hook = lambda command, args: job.cancel() if command == "FETCH" else None
        service.scan_mailbox(job, [SECRET], QQ, lambda *a, **kw: fake)
        self.assertEqual(job.snapshot()["status"], "cancelled")
        self.assertNotIn("messages", job.snapshot())
        self.assertFalse(any(call[0] == "FETCH" and call[2] == "(BODY.PEEK[])" for call in fake.calls))
        self.assertEqual(fake.calls[-1], ("logout",))

    def test_cancel_during_login_stops_before_reading_mail(self):
        job = service.ScanJob("person@qq.com", 100)
        fake = FakeIMAP()
        envelope = [SECRET]

        def login(email, code):
            self.assertEqual(envelope, [])
            job.cancel()
            return "OK", []

        fake.login = login
        service.scan_mailbox(job, envelope, QQ, lambda *a, **kw: fake)
        self.assertEqual(job.status, "cancelled")
        self.assertEqual(fake.calls, [("logout",)])
        self.assertTrue(job.worker_done.is_set())

    def test_complete_waits_until_logout_finishes(self):
        job = service.ScanJob("person@qq.com", 100)
        fake = FakeIMAP()
        logging_out = threading.Event()
        release_logout = threading.Event()

        def logout():
            logging_out.set()
            if not release_logout.wait(3):
                raise TimeoutError("test logout deadline")
            return "BYE", []

        fake.logout = logout
        worker = threading.Thread(target=service.scan_mailbox,
                                  args=(job, [SECRET], QQ, lambda *a, **kw: fake))
        worker.start()
        try:
            self.assertTrue(logging_out.wait(2))
            snapshot = job.snapshot()
            self.assertEqual(snapshot["status"], "running")
            self.assertFalse(snapshot["disconnected"])
            self.assertNotIn("messages", snapshot)
        finally:
            release_logout.set()
            worker.join(timeout=3)
        self.assertFalse(worker.is_alive())
        self.assertEqual(job.snapshot()["status"], "complete")
        self.assertTrue(job.snapshot()["disconnected"])

    def test_logout_error_closes_transport_before_complete(self):
        fake = FakeIMAP()
        fake.sock, peer = socket.socketpair()
        fake.file = fake.sock.makefile("rb")
        shutdown_called = []

        def failed_logout():
            raise OSError("server went away")

        def shutdown():
            shutdown_called.append(True)
            service.imaplib.IMAP4.shutdown(fake)

        fake.logout = failed_logout
        fake.shutdown = shutdown
        try:
            job, _ = run_scan(fake)
            self.assertEqual(shutdown_called, [True])
            self.assertEqual(fake.sock.fileno(), -1)
            self.assertTrue(fake.file.closed)
            self.assertEqual(job.status, "complete")
            self.assertTrue(job.snapshot()["disconnected"])
        finally:
            fake.sock.close()
            peer.close()

    def test_cancel_during_logout_never_publishes_collected_mail(self):
        job = service.ScanJob("person@qq.com", 100)
        fake = FakeIMAP()
        logging_out = threading.Event()
        release_logout = threading.Event()

        def logout():
            logging_out.set()
            release_logout.wait(3)
            return "BYE", []

        fake.logout = logout
        worker = threading.Thread(target=service.scan_mailbox,
                                  args=(job, [SECRET], QQ, lambda *a, **kw: fake))
        worker.start()
        try:
            self.assertTrue(logging_out.wait(2))
            job.cancel()
            self.assertEqual(job.status, "cancelled")
            self.assertFalse(job.snapshot()["disconnected"])
            self.assertNotIn("messages", job.snapshot())
        finally:
            release_logout.set()
            worker.join(timeout=3)
        self.assertEqual(job.status, "cancelled")
        self.assertTrue(job.snapshot()["disconnected"])
        self.assertEqual(job.messages, [])

    def test_empty_mailbox_completes_without_invented_messages(self):
        fake = FakeIMAP({})
        job, _ = run_scan(fake)
        self.assertEqual((job.status, job.total, job.scanned, job.messages), ("complete", 0, 0, []))
        self.assertFalse(any(call[0] == "FETCH" for call in fake.calls))

    def test_provider_exception_does_not_expose_secret(self):
        fake = FakeIMAP()

        def unsafe_login(email, code):
            raise service.imaplib.IMAP4.error(f"failed {email} {code}")

        fake.login = unsafe_login
        job, _ = run_scan(fake)
        self.assertEqual(job.status, "failed")
        self.assertNotIn(SECRET, json.dumps(job.snapshot()))
        self.assertNotIn("person@qq.com", job.error)
        self.assertEqual(job.messages, [])
        self.assertEqual(fake.calls[-1], ("logout",))

    def test_netease_identifies_own_client_only_when_advertised(self):
        fake = FakeIMAP()
        fake.capabilities = (b"IMAP4rev1", b"ID")
        run_scan(fake, provider=service.PROVIDERS[1])
        self.assertIn(("ID", '("name" "MailTrail" "version" "0.1")'), fake.calls)
        plain = FakeIMAP()
        run_scan(plain, provider=service.PROVIDERS[1])
        self.assertFalse(any(call[0] == "ID" for call in plain.calls))

    def test_running_results_never_expose_messages(self):
        job = service.ScanJob("person@qq.com", 100)
        job.messages = [{"raw": "secret"}]
        self.assertNotIn("messages", job.snapshot())

    def test_job_expiration_purges_raw_mail(self):
        manager = service.JobManager(start_cleanup=False)
        job = service.ScanJob("person@qq.com", 100)
        job.messages = [{"raw": "private"}]
        job.finished = time.monotonic() - service.JOB_TTL - 1
        manager.jobs[job.id] = job
        manager.cleanup()
        self.assertEqual(manager.jobs, {})
        self.assertEqual(job.messages, [])
        self.assertTrue(job.stop.is_set())

    def test_manager_bounds_jobs_and_evicts_completed_results(self):
        manager = service.JobManager(imap_factory=lambda *a, **kw: FakeIMAP(), start_cleanup=False)
        old_jobs = []
        for index in range(service.MAX_JOBS):
            job = service.ScanJob("person@qq.com", 100)
            job.status = "complete"
            job.messages = [{"raw": "private"}]
            job.created = time.monotonic() - 10 + index
            job.finished = time.monotonic()
            job.worker_done.set()
            manager.jobs[job.id] = job
            old_jobs.append(job)
        job_id = manager.start({"email": "person@qq.com", "authorizationCode": SECRET, "limit": 100})
        self.assertEqual(len(manager.jobs), service.MAX_JOBS)
        self.assertNotIn(old_jobs[0].id, manager.jobs)
        self.assertEqual(old_jobs[0].messages, [])
        self.assertTrue(manager.get(job_id).worker_done.wait(2))
        manager.close()


class HttpTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.temp = tempfile.TemporaryDirectory()
        Path(cls.temp.name, "index.html").write_text("local test", encoding="utf-8")
        cls.manager = service.JobManager(imap_factory=lambda *a, **kw: FakeIMAP())
        cls.server = service.MailTrailServer(port=0, web_root=cls.temp.name, manager=cls.manager)
        cls.thread = threading.Thread(target=cls.server.serve_forever, daemon=True)
        cls.thread.start()

    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown()
        cls.server.server_close()
        cls.thread.join(timeout=2)
        cls.temp.cleanup()

    def request(self, path, method="GET", body=None, headers=None):
        conn = http.client.HTTPConnection("127.0.0.1", self.server.server_port, timeout=5)
        conn.request(method, path, body=body, headers=headers or {})
        response = conn.getresponse()
        result = response.status, dict(response.headers), response.read()
        conn.close()
        return result

    def test_config_and_static_serving(self):
        status, headers, body = self.request("/api/mail-trail/config")
        self.assertEqual(status, 200)
        self.assertEqual(headers["Cache-Control"], "no-store")
        self.assertNotIn("Access-Control-Allow-Origin", headers)
        config = json.loads(body)
        self.assertTrue(config["localOnly"])
        self.assertEqual(config["token"], self.server.token)
        self.assertEqual(self.request("/")[2], b"local test")

    def test_host_origin_and_cross_site_guards(self):
        for headers in ({"Host": "evil.example"}, {"Origin": "https://evil.example"},
                        {"Origin": "null"}, {"Sec-Fetch-Site": "cross-site"}):
            with self.subTest(headers=headers):
                self.assertEqual(self.request("/api/mail-trail/config", headers=headers)[0], 403)
        self.assertEqual(self.request("/api/mail-trail/status?jobId=none")[0], 403)
        self.assertEqual(self.request("/api/mail-trail/status?jobId=none", headers={"X-MailTrail-Token": "wrong"})[0], 403)

    def test_post_requires_json_valid_size_and_token(self):
        token = {"X-MailTrail-Token": self.server.token}
        self.assertEqual(self.request("/api/mail-trail/scan", "POST", "{}", {"Content-Type": "application/json"})[0], 403)
        self.assertEqual(self.request("/api/mail-trail/scan", "POST", "{}", token)[0], 415)
        headers = token | {"Content-Type": "application/json"}
        self.assertEqual(self.request("/api/mail-trail/scan", "POST", "x" * 5000, headers)[0], 413)
        self.assertEqual(self.request("/api/mail-trail/scan", "POST", "[]", headers)[0], 400)
        self.assertEqual(self.request("/api/mail-trail/scan", "POST", "{", headers)[0], 400)

    def test_scan_status_and_cancel_full_offline_flow(self):
        headers = {"X-MailTrail-Token": self.server.token, "Content-Type": "application/json"}
        payload = json.dumps({"email": "person@qq.com", "authorizationCode": SECRET, "limit": 100})
        status, _, body = self.request("/api/mail-trail/scan", "POST", payload, headers)
        self.assertEqual(status, 202)
        job_id = json.loads(body)["jobId"]
        deadline = time.monotonic() + 5
        while True:
            status, response_headers, body = self.request(f"/api/mail-trail/status?jobId={job_id}", headers=headers)
            result = json.loads(body)
            if result["status"] != "running":
                break
            self.assertLess(time.monotonic(), deadline)
            time.sleep(0.005)
        self.assertEqual(result["status"], "complete")
        self.assertEqual(len(result["messages"]), 1)
        self.assertNotIn(SECRET, body.decode())
        self.assertEqual(response_headers["Cache-Control"], "no-store")
        self.assertEqual(self.request("/api/mail-trail/cancel", "POST", json.dumps({"jobId": job_id}), headers)[0], 200)
        result = json.loads(self.request(f"/api/mail-trail/status?jobId={job_id}", headers=headers)[2])
        self.assertEqual(result["status"], "cancelled")
        self.assertNotIn("messages", result)


if __name__ == "__main__":
    unittest.main()
