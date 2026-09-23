"""Build the dependency-free Leak Check capability showcase."""

from pathlib import Path
import shutil


PROJECT = Path(__file__).resolve().parents[1]
ROOT = PROJECT.parents[1]
DESTINATION = ROOT / "web" / PROJECT.name


def main():
    DESTINATION.mkdir(parents=True, exist_ok=True)
    for name in ("index.html", "styles.css", "app.js", "favicon.svg"):
        shutil.copy2(PROJECT / "site" / name, DESTINATION / name)
    mail_trail = PROJECT / "site" / "mail-trail"
    if mail_trail.is_dir():
        shutil.copytree(mail_trail, DESTINATION / "mail-trail", dirs_exist_ok=True)
    notes = DESTINATION / "notes"
    notes.mkdir(exist_ok=True)
    for name in ("README.md", "source-audit.md", "verification.json", "web-verification.md", "mail-trail.md", "product-roadmap.md"):
        content = (PROJECT / "notes" / name).read_text(encoding="utf-8")
        if name.endswith(".md"):
            content = content.replace("(../README.md)", "(../research.md)")
        (notes / name).write_text(content, encoding="utf-8", newline="\n")
    research = (PROJECT / "README.md").read_text(encoding="utf-8")
    research = research.replace("(../../README.md)", "(../)")
    research = research.replace("(site/index.html)", "(index.html)")
    research = research.replace("(site/mail-trail/index.html)", "(mail-trail/index.html)")
    research = research.replace("(assets/cover.png)", "(cover.png)")
    (DESTINATION / "research.md").write_text(research, encoding="utf-8", newline="\n")
    assets = DESTINATION / "assets"
    assets.mkdir(exist_ok=True)
    for name in ("understanding-map.svg", "understanding-map.png"):
        shutil.copy2(PROJECT / "assets" / name, assets / name)
    cover = PROJECT / "assets" / "cover.png"
    if cover.is_file():
        shutil.copy2(cover, DESTINATION / "cover.png")
    print(f"Built {DESTINATION.relative_to(ROOT)} (static, no personal-data requests).")


if __name__ == "__main__":
    main()
