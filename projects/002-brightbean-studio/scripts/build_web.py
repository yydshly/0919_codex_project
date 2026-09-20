"""Copy the standalone research page and portable notes into the shared site."""
from pathlib import Path
import shutil
from build_guide import main as build_guide

PROJECT = Path(__file__).resolve().parents[1]
ROOT = PROJECT.parents[1]
DESTINATION = ROOT / "web" / PROJECT.name


def main():
    build_guide()
    DESTINATION.mkdir(parents=True, exist_ok=True)
    for filename in ("index.html", "styles.css", "app.js", "favicon.svg"):
        shutil.copy2(PROJECT / "site" / filename, DESTINATION / filename)
    links = {
        "../../README.md": "../",
        "../001-video-shotcraft/README.md": "../001-video-shotcraft/",
        "notes/README.md": "notes.md",
        "../architecture.md": "architecture.md",
        "../README.md": "research.md",
        "](README.md)": "](research.md)",
        "site/index.html": "index.html",
        "../../web/index.html": "../",
        "assets/cover.png": "cover.png",
        "assets/connection-guide.svg": "connection-guide.svg",
        "assets/connection-guide.png": "connection-guide.png",
    }
    for source, target in (("README.md", "research.md"), ("architecture.md", "architecture.md"), ("notes/README.md", "notes.md"), ("connection-guide.md", "connection-guide.md")):
        content = (PROJECT / source).read_text(encoding="utf-8-sig")
        for old, new in links.items():
            content = content.replace(old, new)
        (DESTINATION / target).write_text(content, encoding="utf-8", newline="\n")
    cover = PROJECT / "assets" / "cover.png"
    if cover.is_file():
        shutil.copy2(cover, DESTINATION / "cover.png")
    for name in ("connection-guide.svg", "connection-guide.png"):
        shutil.copy2(PROJECT / "assets" / name, DESTINATION / name)
    print(f"Built {DESTINATION.relative_to(ROOT)} (no third-party dependencies).")


if __name__ == "__main__":
    main()
