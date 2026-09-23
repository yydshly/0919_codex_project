"""Reproduce pinned source observations without running the upstream server."""

import ast
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path
import platform
import re
import sqlite3
import tempfile
from urllib.request import urlopen


COMMIT = "7e3a113b9cf616b142ad5236c547c2c9a9246607"
BASE = f"https://raw.githubusercontent.com/garinasset/leak-check/{COMMIT}/"
PROJECT = Path(__file__).resolve().parents[1]
FILES = ("main.py", "db/crud.py", "models/request.py", "lib/masking.py", "example.db")


def require(condition, message):
    if not condition:
        raise RuntimeError(message)


def main():
    blobs = {}
    for name in FILES:
        with urlopen(BASE + name, timeout=30) as response:
            blobs[name] = response.read()

    with tempfile.TemporaryDirectory(prefix="leak_check_research_") as folder:
        database_path = Path(folder) / "example.db"
        database_path.write_bytes(blobs["example.db"])
        connection = sqlite3.connect(database_path.as_uri() + "?mode=ro", uri=True)
        try:
            schema = [dict(type=kind, name=name, sql=sql) for kind, name, sql in connection.execute(
                "SELECT type, name, sql FROM sqlite_master "
                "WHERE type IN ('table', 'index') ORDER BY type, name"
            )]
            counts = {
                "person": connection.execute("SELECT COUNT(*) FROM person").fetchone()[0],
                "source": connection.execute("SELECT COUNT(*) FROM source").fetchone()[0],
            }
            indexes = {
                table: [list(row) for row in connection.execute(f"PRAGMA index_list('{table}')")]
                for table in ("person", "source")
            }
        finally:
            connection.close()

    require(counts == {"person": 8, "source": 4}, "Unexpected example database counts")
    require(not any(indexes.values()), "Unexpected example database indexes")

    # Isolate only the reviewed method at this immutable commit. This checks its
    # function body, not Pydantic integration or application compatibility.
    request_tree = ast.parse(blobs["models/request.py"].decode("utf-8"))
    request_class = next(node for node in request_tree.body
                         if isinstance(node, ast.ClassDef) and node.name == "ModelRequestQuery")
    validator = next(node for node in request_class.body
                     if isinstance(node, ast.FunctionDef) and node.name == "validate_and_detect")
    validator.decorator_list = []
    isolated = ast.fix_missing_locations(ast.Module(body=[validator], type_ignores=[]))
    namespace = {"re": re}
    exec(compile(isolated, "<pinned-input-validator>", "exec"), namespace)
    cases = []
    for original, expected in (
        ("alice-test@example.com", "alicetest@example.com"),
        ("alice@example-domain.com", "alice@exampledomain.com"),
    ):
        result = namespace["validate_and_detect"](None, {"q": original})
        require(result == {"q": expected, "type": "email"}, "Unexpected input cleaning result")
        cases.append({"synthetic_input": original, "result": result,
                      "input_changed": original != result["q"]})

    routes = []
    for node in ast.walk(ast.parse(blobs["main.py"].decode("utf-8"))):
        if not isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
            continue
        for decorator in node.decorator_list:
            if (isinstance(decorator, ast.Call) and isinstance(decorator.func, ast.Attribute)
                    and isinstance(decorator.func.value, ast.Name)
                    and decorator.func.value.id == "app"
                    and decorator.func.attr in {"get", "post"}):
                routes.append({"method": decorator.func.attr.upper(),
                               "path": ast.literal_eval(decorator.args[0]), "function": node.name})
    require(len(routes) == 3, "Unexpected number of explicit application routes")

    report = {
        "commit": COMMIT,
        "verified_at_utc": datetime.now(timezone.utc).isoformat(),
        "python": platform.python_version(),
        "scope": "Read-only example schema/counts; isolated validator; route AST inspection. No live personal-data query or full app execution.",
        "files": {name: {"url": BASE + name, "bytes": len(data),
                         "sha256": hashlib.sha256(data).hexdigest()} for name, data in blobs.items()},
        "database": {"schema": schema, "row_counts": counts, "indexes": indexes},
        "synthetic_email_checks": cases,
        "explicit_routes": routes,
        "result": "All research observations reproduced for the pinned commit",
    }
    destination = PROJECT / "notes" / "verification.json"
    destination.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Verified pinned commit {COMMIT}; saved {destination.name}")
    print("Example counts: person=8, source=4; no query indexes; two email-cleaning issues reproduced.")


if __name__ == "__main__":
    main()
