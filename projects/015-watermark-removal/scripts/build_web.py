"""Build the dependency-free Watermark Removal research page."""
from pathlib import Path
import shutil

PROJECT = Path(__file__).resolve().parents[1]
ROOT = PROJECT.parents[1]
DESTINATION = ROOT / "web" / PROJECT.name


def main():
    DESTINATION.mkdir(parents=True, exist_ok=True)
    for name in (
        "index.html", "styles.css", "app.js", "knowledge.css", "overview.css",
        "understanding-poster.html", "understanding-summary.png",
    ):
        shutil.copy2(PROJECT / "site" / name, DESTINATION / name)
    shutil.copytree(PROJECT / "site" / "samples", DESTINATION / "samples", dirs_exist_ok=True)
    cover = PROJECT / "assets" / "cover.png"
    if cover.is_file():
        shutil.copy2(cover, DESTINATION / "cover.png")
    print(f"Built {DESTINATION.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
