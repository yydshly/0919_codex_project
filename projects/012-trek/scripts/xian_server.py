"""Loopback-only Xi'an product demo: curated places + real TREK persistence.

No dependencies. The browser never receives TREK credentials. This adapter may
only modify the marked, dedicated Xi'an trip; route requests use fixed providers.
"""
from __future__ import annotations

import http.cookiejar
import json
import logging
import math
import os
import re
import threading
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
SITE = Path(__file__).resolve().parents[1] / "site" / "xian"
RUNTIME = ROOT / ".local" / "xian-demo"
STATE_FILE = RUNTIME / "state.json"
UPSTREAM_ENV = ROOT / ".local/trek-extracted/TREK-b98787f83698f3beee1b9a8475121c52f0caf07c/server/.env"
BASE = "http://127.0.0.1:3212"
PORT = 5213
TITLE = "长安初见 · 西安首访"
MARKER = "[xian-first-visit:v1]"
PLAN_LOCK = threading.RLock()
ROUTE_LOCK = threading.Lock()
ROUTE_CACHE = {}
MAX_BODY = 64 * 1024


class PublicError(Exception):
    def __init__(self, message, status=502):
        super().__init__(message)
        self.status = status


class UpstreamError(Exception):
    def __init__(self, status):
        self.status = status


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        raise PublicError("服务返回了意外跳转，请稍后重试。")


def now():
    return datetime.now(timezone.utc).isoformat()


def read_env():
    config = {}
    if UPSTREAM_ENV.exists():
        for raw in UPSTREAM_ENV.read_text(encoding="utf-8-sig").splitlines():
            line = raw.strip()
            if line and not line.startswith("#") and "=" in line:
                key, value = line.split("=", 1)
                config[key.strip()] = value.strip().strip("\"'")
    email = os.getenv("XIAN_TREK_EMAIL") or config.get("ADMIN_EMAIL")
    password = os.getenv("XIAN_TREK_PASSWORD") or config.get("ADMIN_PASSWORD")
    if not email or not password:
        raise PublicError("尚未配置本地 TREK 登录信息，请先启动原版实例。", 503)
    return email, password


class Trek:
    def __init__(self):
        self.opener = urllib.request.build_opener(
            urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()), NoRedirect()
        )
        self.logged_in = False

    def request(self, path, data=None, method=None, retry=True):
        if path != "/auth/login" and not self.logged_in:
            self.login()
        request = urllib.request.Request(
            BASE + "/api" + path,
            data=json.dumps(data, ensure_ascii=False).encode("utf-8") if data is not None else None,
            headers={"Content-Type": "application/json", "Origin": BASE},
            method=method or ("POST" if data is not None else "GET"),
        )
        try:
            with self.opener.open(request, timeout=15) as response:
                return json.load(response)
        except urllib.error.HTTPError as error:
            if error.code == 401 and retry and path != "/auth/login":
                self.logged_in = False
                self.login()
                return self.request(path, data, method, retry=False)
            raise UpstreamError(error.code) from None
        except (urllib.error.URLError, TimeoutError, OSError, ValueError):
            raise PublicError("本地 TREK 暂时无法连接。请启动原版后重试；已保存的旅行不会被清空。", 503) from None

    def login(self):
        email, password = read_env()
        try:
            self.request("/auth/login", {"email": email, "password": password}, retry=False)
        except UpstreamError:
            raise PublicError("本地 TREK 登录失败，请检查本机登录配置。", 503) from None
        self.logged_in = True


TREK = Trek()


def catalog():
    try:
        raw = json.loads((SITE / "places.json").read_text(encoding="utf-8-sig"))
        places = raw["places"] if isinstance(raw, dict) else raw
        result = {}
        for place in places:
            if not isinstance(place.get("id"), str):
                raise ValueError()
            lat, lng = float(place["lat"]), float(place["lng"])
            if not (33.5 < lat < 35.0 and 107.5 < lng < 110.5):
                raise ValueError()
            result[place["id"]] = place
        if not result:
            raise ValueError()
        return result
    except (OSError, ValueError, KeyError, TypeError):
        raise PublicError("西安地点资料尚未准备好，请稍后重试。", 503) from None


def state_read():
    if not STATE_FILE.exists():
        return {"places": {}}
    try:
        state = json.loads(STATE_FILE.read_text(encoding="utf-8"))
        if not isinstance(state, dict) or not isinstance(state.get("places", {}), dict):
            raise ValueError()
        return state
    except (OSError, ValueError):
        raise PublicError("本地演示状态需要检查；为保护已有旅行，本次没有进行写入。", 409) from None


def state_write(state):
    RUNTIME.mkdir(parents=True, exist_ok=True)
    temp = STATE_FILE.with_suffix(".tmp")
    temp.write_text(json.dumps(state, ensure_ascii=False, indent=2), encoding="utf-8")
    temp.replace(STATE_FILE)


def owned_trip(state, discover=False):
    tid = state.get("tripId")
    if tid is not None:
        if type(tid) is not int or tid < 1:
            raise PublicError("本地旅行引用不正确，已停止写入。", 409)
        try:
            trip = TREK.request(f"/trips/{tid}")["trip"]
        except UpstreamError as error:
            if error.status == 404:
                state.pop("tripId", None)
                state["places"] = {}
                state_write(state)
                return None
            raise
        if not str(trip.get("description") or "").startswith(MARKER):
            raise PublicError("旅行的演示标记已变化，已停止写入以保护其他旅行。", 409)
        return trip
    if discover:
        trips = TREK.request("/trips")["trips"]
        matches = [t for t in trips if t.get("title") == TITLE and str(t.get("description") or "").startswith(MARKER)]
        if len(matches) > 1:
            raise PublicError("发现多个西安演示旅行，请先核对本地实例。", 409)
        if matches:
            state["tripId"] = matches[0]["id"]
            state_write(state)
            return matches[0]
    return None


def validate_plan(body):
    places = catalog()
    if not isinstance(body, dict) or set(body) - {"title", "profile", "days"}:
        raise PublicError("计划只能包含标题、偏好和每天的地点。", 400)
    title = body.get("title", TITLE)
    profile = body.get("profile", {})
    days = body.get("days")
    if not isinstance(title, str) or not 1 <= len(title.strip()) <= 100:
        raise PublicError("请输入 1–100 字的计划标题。", 400)
    if not isinstance(profile, dict) or set(profile) - {"pace", "interests", "party", "days", "museumBooked", "selectedIds"}:
        raise PublicError("出行偏好格式不正确。", 400)
    for key, value in profile.items():
        if key == "museumBooked":
            if type(value) is not bool:
                raise PublicError("博物馆预约选项应为是或否。", 400)
        elif key == "selectedIds":
            if not isinstance(value, list) or len(value) > 40 or any(not isinstance(pid, str) or pid not in places for pid in value):
                raise PublicError("收藏列表包含未收录地点，或超过 40 个地点。", 400)
            if len(set(value)) != len(value):
                raise PublicError("收藏列表不能重复包含同一个地点。", 400)
        elif key == "days":
            if type(value) is not int or not 1 <= value <= 7:
                raise PublicError("行程天数应在 1–7 天之间。", 400)
        elif key == "interests":
            if not isinstance(value, list) or len(value) > 12 or any(not isinstance(s, str) or len(s) > 40 for s in value):
                raise PublicError("兴趣选项格式不正确。", 400)
        elif not isinstance(value, str) or len(value) > 80:
            raise PublicError("出行偏好格式不正确。", 400)
    if not isinstance(days, list) or not 1 <= len(days) <= 7:
        raise PublicError("计划应包含 1–7 天。", 400)
    clean_days, count = [], 0
    for day in days:
        if not isinstance(day, dict) or set(day) - {"title", "stops"}:
            raise PublicError("每日行程格式不正确。", 400)
        name, stops = day.get("title"), day.get("stops")
        if not isinstance(name, str) or not 1 <= len(name) <= 100 or not isinstance(stops, list) or len(stops) > 12:
            raise PublicError("每天需要标题，且最多安排 12 个地点。", 400)
        clean, seen, previous_time = [], set(), ""
        for stop in stops:
            if not isinstance(stop, dict) or set(stop) != {"placeId", "time"}:
                raise PublicError("地点必须包含 placeId 和 time。", 400)
            pid, start = stop["placeId"], stop["time"]
            if not isinstance(pid, str) or pid not in places:
                raise PublicError("计划中含有未收录的地点，请从西安地点列表选择。", 400)
            if pid in seen:
                raise PublicError("同一天不能重复安排同一地点。", 400)
            if not isinstance(start, str) or not re.fullmatch(r"(?:[01]\d|2[0-3]):[0-5]\d", start):
                raise PublicError("请使用 HH:MM 格式填写时间。", 400)
            if start < previous_time:
                raise PublicError("每日地点请按时间先后安排。", 400)
            seen.add(pid)
            previous_time = start
            clean.append({"placeId": pid, "time": start})
        clean_days.append({"title": name, "stops": clean})
        count += len(clean)
    if not count or count > 40:
        raise PublicError("请为整个旅行选择 1–40 个地点。", 400)
    if "days" in profile and profile["days"] != len(days):
        raise PublicError("偏好天数与实际行程天数不一致。", 400)
    return {"title": title.strip(), "profile": profile, "days": clean_days}, places


def place_marker(pid):
    return f"{MARKER} place:{pid}"


def recover_places(state, records, places):
    mapping = {}
    for record in records:
        notes = str(record.get("notes") or "")
        for pid in places:
            if notes.split("\n", 1)[0] == place_marker(pid):
                mapping[pid] = record["id"]
                break
    state["places"] = mapping
    return mapping


def read_plan(state=None):
    with PLAN_LOCK:
        state = state if state is not None else state_read()
        trip = owned_trip(state, discover=True)
        if not trip:
            return {"tripId": None, "trekUrl": BASE + "/dashboard", "plan": None}
        tid = trip["id"]
        places = catalog()
        records = TREK.request(f"/trips/{tid}/places")["places"]
        mapping = recover_places(state, records, places)
        reverse = {value: key for key, value in mapping.items()}
        remote_days = TREK.request(f"/trips/{tid}/days")["days"]
        days, unrecognized = [], 0
        for day in remote_days:
            # Read assignment endpoint separately: proves the persisted itinerary
            # rather than trusting the adapter's last request/state file.
            assignments = TREK.request(f"/trips/{tid}/days/{day['id']}/assignments")["assignments"]
            stops = []
            for a in assignments:
                pid = reverse.get(a.get("place_id"))
                if pid:
                    stops.append({"placeId": pid, "time": a.get("assignment_time") or a.get("place", {}).get("place_time") or "09:00"})
                else:
                    unrecognized += 1
            days.append({"title": day.get("title") or f"第 {len(days) + 1} 天", "stops": stops})
        profile = state.get("profile", {})
        profile["days"] = len(days)
        plan = {"title": state.get("title", TITLE), "profile": profile, "days": days}
        state_write(state)
        result = {"tripId": tid, "trekUrl": f"{BASE}/trips/{tid}", "plan": plan, "updatedAt": state.get("updatedAt"), "verifiedFrom": "TREK REST API"}
        if unrecognized:
            result["warning"] = f"原版中另有 {unrecognized} 个未收录地点，此页面未显示；再次保存会以本页面的计划更新此专属旅行。"
        return result


def save_plan(body):
    plan, places = validate_plan(body)
    with PLAN_LOCK:
        state = state_read()
        trip = owned_trip(state, discover=True)
        if not trip:
            trip = TREK.request("/trips", {
                "title": TITLE,
                "description": MARKER + "\n西安首次到访产品演示。真实地点与实际行程保存；推荐安排是示例，不代表实时营业、预约或交易。",
                "currency": "CNY", "day_count": len(plan["days"]),
            })["trip"]
            state.update({"tripId": trip["id"], "places": {}})
            state_write(state)
        tid, base = trip["id"], f"/trips/{trip['id']}"
        records = TREK.request(base + "/places")["places"]
        mapping = recover_places(state, records, places)
        wanted = {stop["placeId"] for day in plan["days"] for stop in day["stops"]}
        categories = TREK.request("/categories")["categories"]
        def category_id(kind):
            candidates = ["restaurant", "food", "餐饮", "餐厅", "美食"] if kind == "food" else ["sightseeing", "attraction", "景点", "观光"]
            return next((c["id"] for c in categories if any(term in c["name"].lower() for term in candidates)), None)
        for pid in sorted(wanted):
            if pid not in mapping:
                p = places[pid]
                notes = "\n".join(str(x) for x in [place_marker(pid), p.get("reason"), p.get("practical"), p.get("reservation"), p.get("priceNote")] if x)
                data = {"name": p["name"], "lat": p["lat"], "lng": p["lng"], "address": p.get("address", "西安市"), "notes": notes, "duration_minutes": int(p.get("duration", 60)), "currency": "CNY"}
                category = category_id(p.get("kind"))
                if category is not None:
                    data["category_id"] = category
                mapping[pid] = TREK.request(base + "/places", data)["place"]["id"]
                state_write(state)
        days = TREK.request(base + "/days")["days"]
        while len(days) < len(plan["days"]):
            days.append(TREK.request(base + "/days", {})["day"])
        # Reconcile desired slots instead of delete/recreate: repeating a failed
        # save reuses existing records and doesn't duplicate places or stops.
        for i, wanted_day in enumerate(plan["days"]):
            day = days[i]
            day_path = base + f"/days/{day['id']}"
            TREK.request(day_path, {"title": wanted_day["title"]}, "PUT")
            TREK.request(day_path + "/transport", {"transport_mode": "driving"}, "PUT")
            old = TREK.request(day_path + "/assignments")["assignments"]
            available = {}
            for assignment in old:
                available.setdefault(assignment["place_id"], []).append(assignment)
            order = []
            for stop in wanted_day["stops"]:
                place_id = mapping[stop["placeId"]]
                existing = available.get(place_id, [])
                assignment = existing.pop(0) if existing else TREK.request(day_path + "/assignments", {"place_id": place_id})["assignment"]
                start = stop["time"]
                minutes = int(start[:2]) * 60 + int(start[3:]) + int(places[stop["placeId"]].get("duration", 60))
                end = f"{min(minutes, 1439) // 60:02}:{min(minutes, 1439) % 60:02}"
                TREK.request(base + f"/assignments/{assignment['id']}/time", {"place_time": start, "end_time": end}, "PUT")
                order.append(assignment["id"])
            for leftovers in available.values():
                for assignment in leftovers:
                    TREK.request(day_path + f"/assignments/{assignment['id']}", method="DELETE")
            TREK.request(day_path + "/assignments/reorder", {"orderedIds": order}, "PUT")
        for day in reversed(days[len(plan["days"]):]):
            TREK.request(base + f"/days/{day['id']}", method="DELETE")
        state.update({"title": plan["title"], "profile": plan["profile"], "updatedAt": now()})
        state_write(state)
        result = read_plan(state)
        if result["plan"]["days"] != plan["days"]:
            raise PublicError("原版已收到计划，但读回核对未通过；请重试保存。", 502)
        result["ok"] = True
        return result


def route(query):
    if set(query) - {"ids", "mode"} or any(len(v) != 1 for v in query.values()):
        raise PublicError("路线参数不正确。", 400)
    ids = query.get("ids", [""])[0].split(",")
    mode = query.get("mode", ["driving"])[0]
    places = catalog()
    if mode not in ("walking", "driving") or not 2 <= len(ids) <= 12 or any(pid not in places for pid in ids):
        raise PublicError("请选择 2–12 个已收录地点及有效出行方式。", 400)
    coords = ";".join(f"{places[pid]['lng']},{places[pid]['lat']}" for pid in ids)
    key = mode + ":" + coords
    with ROUTE_LOCK:
        hit = ROUTE_CACHE.get(key)
        if hit and time.monotonic() - hit[0] < (3600 if hit[1].get("ok") else 20):
            return {**hit[1], "cached": True}
    # Separate OSRM instances are built with different profiles. A driving
    # route is never relabelled as walking when the foot service is unavailable.
    endpoint = "https://routing.openstreetmap.de/routed-foot/route/v1/foot/" if mode == "walking" else "https://router.project-osrm.org/route/v1/driving/"
    url = endpoint + coords + "?overview=full&geometries=geojson&steps=false"
    request = urllib.request.Request(url, headers={"User-Agent": "XianFirstVisitLocalDemo/1.0", "Accept": "application/json"})
    try:
        opener = urllib.request.build_opener(NoRedirect())
        with opener.open(request, timeout=12) as response:
            raw = response.read(4 * 1024 * 1024)
            data = json.loads(raw)
        if data.get("code") != "Ok" or not data.get("routes"):
            raise ValueError()
        chosen = data["routes"][0]
        coordinates = chosen["geometry"]["coordinates"]
        if not coordinates or any(len(point) < 2 or not all(isinstance(n, (int, float)) and math.isfinite(n) for n in point[:2]) for point in coordinates):
            raise ValueError()
        result = {"ok": True, "coordinates": [[p[1], p[0]] for p in coordinates], "distance": chosen["distance"], "duration": chosen["duration"], "provider": "OSRM", "mode": mode, "fetchedAt": now()}
    except (OSError, urllib.error.URLError, ValueError, KeyError, TypeError, PublicError):
        result = {"ok": False, "error": "道路路线服务暂时不可用；地图仍显示真实地点，请使用导航入口确认路线。", "provider": "OSRM", "mode": mode}
    with ROUTE_LOCK:
        if len(ROUTE_CACHE) > 100:
            ROUTE_CACHE.clear()
        ROUTE_CACHE[key] = (time.monotonic(), result)
    return result


def trek_health():
    try:
        with urllib.request.urlopen(BASE + "/api/health", timeout=2) as response:
            return response.status == 200
    except (OSError, urllib.error.URLError):
        return False


class Handler(SimpleHTTPRequestHandler):
    server_version = "XianLocal/1.0"

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(SITE), **kwargs)

    def log_message(self, format, *args):
        # Paths only; never request bodies, cookie values or server credentials.
        logging.info("%s %s", self.command, self.path.split("?", 1)[0])

    def end_headers(self):
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Referrer-Policy", "strict-origin-when-cross-origin")
        super().end_headers()

    def valid_host(self):
        return self.headers.get("Host") in (f"127.0.0.1:{PORT}", f"localhost:{PORT}")

    def respond(self, body, status=200):
        payload = json.dumps(body, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(payload)))
        self.end_headers()
        try:
            self.wfile.write(payload)
        except (BrokenPipeError, ConnectionResetError, ConnectionAbortedError):
            pass

    def guarded(self, action):
        try:
            self.respond(action())
        except PublicError as error:
            self.respond({"ok": False, "error": str(error)}, error.status)
        except UpstreamError as error:
            self.respond({"ok": False, "error": "原版 TREK 未能完成请求，请稍后重试。", "upstreamStatus": error.status}, 502)
        except Exception:
            # Traceback may include library details: keep browser error neutral.
            logging.exception("Local adapter request failed")
            self.respond({"ok": False, "error": "本地演示发生错误，请重试；不要关闭原版 TREK。"}, 500)

    def do_GET(self):
        if not self.valid_host():
            self.respond({"ok": False, "error": "仅支持本机访问。"}, 403)
            return
        url = urllib.parse.urlsplit(self.path)
        if url.path == "/api/health":
            self.respond({"ok": True, "trekAvailable": trek_health()})
        elif url.path == "/api/plan":
            self.guarded(read_plan)
        elif url.path == "/api/route":
            self.guarded(lambda: route(urllib.parse.parse_qs(url.query, keep_blank_values=True)))
        elif url.path.startswith("/api/"):
            self.respond({"ok": False, "error": "接口不存在。"}, 404)
        else:
            super().do_GET()

    def do_POST(self):
        expected_origin = "http://" + self.headers.get("Host", "")
        if not self.valid_host() or self.headers.get("Origin") != expected_origin:
            self.respond({"ok": False, "error": "请从本机演示页面保存计划。"}, 403)
            return
        if self.path != "/api/plan":
            self.respond({"ok": False, "error": "接口不存在。"}, 404)
            return
        if self.headers.get_content_type() != "application/json" or self.headers.get("Transfer-Encoding"):
            self.respond({"ok": False, "error": "请提交 JSON 格式的计划。"}, 415)
            return
        try:
            size = int(self.headers.get("Content-Length", "0"))
            if not 0 < size <= MAX_BODY:
                raise PublicError("计划数据过大或为空。", 413)
            self.connection.settimeout(10)
            payload = json.loads(self.rfile.read(size).decode("utf-8"))
        except PublicError as error:
            self.respond({"ok": False, "error": str(error)}, error.status)
            return
        except (ValueError, OSError):
            self.respond({"ok": False, "error": "计划 JSON 格式不正确。"}, 400)
            return
        self.guarded(lambda: save_plan(payload))

    def list_directory(self, path):
        self.send_error(404, "Page not found")
        return None


def main():
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(message)s")
    RUNTIME.mkdir(parents=True, exist_ok=True)
    server = ThreadingHTTPServer(("127.0.0.1", PORT), Handler)
    server.daemon_threads = True
    print(f"Xi'an first-visit demo: http://127.0.0.1:{PORT}", flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
