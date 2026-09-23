"""Copy the dependency-free research page to the collection's web directory."""
from pathlib import Path
import shutil
import runpy

PROJECT = Path(__file__).resolve().parents[1]
ROOT = PROJECT.parents[1]
DESTINATION = ROOT / "web" / PROJECT.name

def main():
    runpy.run_path(str(PROJECT / "scripts" / "build_overview.py"), run_name="__main__")
    DESTINATION.mkdir(parents=True, exist_ok=True)
    for name in ("index.html", "styles.css", "app.js"):
        shutil.copy2(PROJECT / "site" / name, DESTINATION / name)
    cover = PROJECT / "assets" / "cover.png"
    if cover.is_file():
        shutil.copy2(cover, DESTINATION / "cover.png")
    for name in ("capability-overview.svg", "capability-overview.png"):
        asset = PROJECT / "assets" / name
        if asset.is_file():
            shutil.copy2(asset, DESTINATION / name)
    print(f"Built {DESTINATION.relative_to(ROOT)}")

if __name__ == "__main__":
    main()
