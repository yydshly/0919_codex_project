"""Build the Ziwei research page into the shared static site, without dependencies."""
from pathlib import Path
import shutil

PROJECT = Path(__file__).resolve().parents[1]
ROOT = PROJECT.parents[1]
DESTINATION = ROOT / "web" / PROJECT.name


def main():
    DESTINATION.mkdir(parents=True, exist_ok=True)
    for name in ("index.html", "styles.css"):
        shutil.copy2(PROJECT / "site" / name, DESTINATION / name)
    shutil.copy2(PROJECT / "assets" / "upstream-chart.png", DESTINATION / "upstream-chart.png")
    print(f"Built {DESTINATION.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
