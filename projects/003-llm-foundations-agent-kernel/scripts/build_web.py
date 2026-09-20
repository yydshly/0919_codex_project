"""Publish this dependency-free research page to the shared static directory."""
from pathlib import Path
import shutil
from build_overview import main as build_overview

PROJECT = Path(__file__).resolve().parents[1]
ROOT = PROJECT.parents[1]
DESTINATION = ROOT / "web" / PROJECT.name


def main():
    build_overview()
    DESTINATION.mkdir(parents=True, exist_ok=True)
    for name in ("index.html", "styles.css", "app.js", "favicon.svg"):
        shutil.copy2(PROJECT / "site" / name, DESTINATION / name)
    cover = PROJECT / "assets" / "cover.png"
    if cover.is_file():
        shutil.copy2(cover, DESTINATION / "cover.png")
    for name in ("capability-overview.svg", "capability-overview.png"):
        shutil.copy2(PROJECT / "assets" / name, DESTINATION / name)
    shutil.copytree(PROJECT / "assets" / "showcase", DESTINATION / "showcase", dirs_exist_ok=True)
    shutil.copy2(PROJECT / "assets" / "showcase-sources.md", DESTINATION / "showcase-sources.md")
    directions = (PROJECT / "product-directions.md").read_text(encoding="utf-8")
    (DESTINATION / "product-directions.md").write_text(
        directions.replace("[返回研究说明](README.md)", "[返回研究网页](index.html#directions)"),
        encoding="utf-8", newline="\n")
    print(f"Built {DESTINATION.relative_to(ROOT)} (no third-party dependencies).")


if __name__ == "__main__":
    main()
