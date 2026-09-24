"""Read-only and rejected-request checks for the local Xi'an product adapter.

Use --saved after the UI has saved an itinerary. Never creates test trips or
modifies a user's existing plan. An invalid place write must be rejected.
"""
import argparse
import json
import urllib.error
import urllib.request

from xian_server import PublicError, catalog, validate_plan

BASE = "http://127.0.0.1:5213"


def request(path, data=None, origin=BASE, extra_headers=None):
    headers = {"Origin": origin, "Content-Type": "application/json"}
    headers.update(extra_headers or {})
    req = urllib.request.Request(BASE + path, data=json.dumps(data).encode() if data is not None else None, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=20) as res:
            return res.status, json.load(res)
    except urllib.error.HTTPError as err:
        return err.code, json.load(err)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--saved", action="store_true", help="Require an existing, upstream-verified saved plan")
    args = parser.parse_args()
    status, health = request("/api/health")
    assert status == 200 and health["ok"] and health["trekAvailable"], health
    status, before = request("/api/plan")
    assert status == 200, before
    bad_plan = {"title": "Rejected payload", "profile": {"days": 1}, "days": [{"title": "Invalid", "stops": [{"placeId": "unknown-test-id", "time": "09:00"}]}]}
    status, body = request("/api/plan", bad_plan)
    assert status == 400 and body["ok"] is False, body
    # Pure validation: exercise valid optional fields without creating a trip,
    # then isolate invalid profile cases from unrelated invalid stop failures.
    known_id = next(iter(catalog()))
    schema_plan = {"title": "Validation only", "profile": {"museumBooked": True, "selectedIds": [known_id], "days": 1}, "days": [{"title": "Day", "stops": [{"placeId": known_id, "time": "09:00"}]}]}
    normalized, _ = validate_plan(schema_plan)
    assert normalized["profile"] == schema_plan["profile"]
    assert validate_plan({**schema_plan, "profile": {}})[0]["profile"] == {}
    for invalid_profile in ({"museumBooked": "yes"}, {"selectedIds": ["unknown-test-id"]}, {"selectedIds": [known_id] * 41}):
        try:
            validate_plan({**schema_plan, "profile": invalid_profile})
        except PublicError as error:
            assert error.status == 400
        else:
            raise AssertionError("Invalid profile accepted")
    status, body = request("/api/plan", bad_plan, origin="https://example.com")
    assert status == 403, body
    status, body = request("/api/health", extra_headers={"Host": "example.com"})
    assert status == 403, body
    status, body = request("/api/route?ids=not-a-place,https://example.com&mode=driving")
    assert status == 400, body
    status, after = request("/api/plan")
    assert status == 200 and before == after, "Rejected writes changed the plan"
    if args.saved:
        assert isinstance(after.get("tripId"), int) and after.get("verifiedFrom") == "TREK REST API", after
        assert after.get("plan", {}).get("days"), after
        count = sum(len(day["stops"]) for day in after["plan"]["days"])
        assert count > 0, after
        print(f"PASS: saved trip {after['tripId']}, {len(after['plan']['days'])} days, {count} stops read from TREK")
    print("PASS: health, upstream readback, invalid place/profile, cross-origin, Host guard, route allowlist, unchanged persistence")


if __name__ == "__main__":
    main()
