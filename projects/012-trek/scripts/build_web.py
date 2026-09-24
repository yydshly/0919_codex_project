"""Build the public TREK research collection without local runtime data or unlicensed V1 art."""

from pathlib import Path
import re
import shutil

PROJECT = Path(__file__).resolve().parents[1]
ROOT = PROJECT.parents[1]
DESTINATION = ROOT / "web" / PROJECT.name
DESIGN = PROJECT / "design" / "2026-09-22-exploration"


def copy(source: Path, destination: Path) -> None:
    destination.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(source, destination)


def update(path: Path, replacements: tuple[tuple[str, str], ...]) -> None:
    content = path.read_text(encoding="utf-8")
    for old, new in replacements:
        content = content.replace(old, new)
    path.write_text(content, encoding="utf-8", newline="\n")


def publish_design() -> None:
    destination = DESTINATION / "design" / DESIGN.name

    def ignore(directory: str, names: list[str]) -> set[str]:
        skipped = {name for name in names if name in {"screenshots", "__pycache__"} or name.endswith(".py")}
        if Path(directory) == DESIGN / "assets":
            skipped.update({"design-overview.png", "design-generation.png"})
        return skipped

    shutil.copytree(DESIGN, destination, ignore=ignore)
    marker = "v1-public-placeholder.svg"
    screenshot = "archives/2026-09-22-v1-185446/screenshots/01-atlas.png"
    for folder, relative_v1, relative_asset in (
        (destination, "../../v1.html", "../../assets/" + marker),
        (destination / "e1", "../../../v1.html", "../../../assets/" + marker),
        (destination / "e2", "../../../v1.html", "../../../assets/" + marker),
    ):
        page = folder / "index.html"
        update(page, (
            ("http://127.0.0.1:15213/#atlas", relative_v1),
            ("http://127.0.0.1:5213/#plan", relative_v1),
            (("../../" if folder == destination else "../../../") + screenshot, relative_asset),
            ("已有网页截图 · 非新生成效果", "V1 旧图仅在本地归档 · 公开页展示研究摘要"),
            ("归档 V1 的真实页面截图：城市插画旁展示景点实拍和资料", "V1 旧图公开范围未核实的说明卡片"),
            ("打开 V1 归档 ↗", "查看 V1 公开摘要 ↗"),
            ("对照 V1 归档 ↗", "V1 研究摘要 ↗"),
            ("原完整演示", "V1 公开摘要"),
        ))
    script = destination / "design.mjs"
    update(script, (
        ("const archive = 'http://127.0.0.1:15213/';", "const archive = '../../v1.html';"),
        ("const screenRoot = '../../archives/2026-09-22-v1-185446/screenshots/';", "const screenRoot = '../../assets/';"),
        ("const p=pages[index];", "const p=pages[index];p.image='v1-public-placeholder.svg';p.caption='V1 原图仅保存在本地；这里展示研究结论';"),
        ("本页展开归档", "本页展开公开摘要"),
        ("打开归档页面", "打开 V1 公开摘要"),
        ("查看${p.name}完整归档截图", "查看 V1 公开说明图"),
        ("点击查看原尺寸", "点击查看公开说明图"),
    ))
    for markdown in destination.rglob("*.md"):
        content = markdown.read_text(encoding="utf-8")
        content = re.sub(r"!\[[^]]*\]\((?:assets/design-[^)]*|screenshots/[^)]*)\)",
                         "（画面记录留在本地；在线页面可直接操作本阶段实验。）", content)
        markdown.write_text(content, encoding="utf-8", newline="\n")


def main() -> None:
    # The destination is generated output. Check the resolved boundary before replacing it.
    root = ROOT.resolve()
    target = DESTINATION.resolve()
    if not target.is_relative_to(root) or target != (root / "web" / "012-trek"):
        raise SystemExit("Refusing to replace an unexpected output directory")
    if DESTINATION.exists():
        shutil.rmtree(DESTINATION)
    DESTINATION.mkdir(parents=True)

    for name in ("index.html", "research.css", "v1.html", "original.html", "simulation.html",
                 "real.css", "real.mjs", "styles.css", "app.mjs", "core.mjs", "favicon.svg"):
        copy(PROJECT / "site" / name, DESTINATION / name)
    original = DESTINATION / "original.html"
    update(original, (
        ('<body>', '<body><div role="note" style="background:#e7f1eb;color:#234e40;padding:13px 24px;text-align:center;font-size:13px">公开页展示本机实测截图；原版服务及数据只在本机运行。<a href="index.html#study" style="text-decoration:underline">返回研究总览</a></div>'),
        ('href="http://127.0.0.1:3212/trips/2"', 'href="index.html#study"'),
        ('href="http://127.0.0.1:5213"', 'href="v1.html"'),
        ('进入已准备好的旅行 ↗', '返回研究阶段 ↗'),
        ('进入长安初见 西安定制体验 ↗', '查看西安 V1 研究摘要 ↗'),
        ('去原版操作 ↗', '返回研究总览 ↗'),
        ('打开原版 ↗', '返回研究总览 ↗'),
        ('亲自继续这趟旅行', '原版实测范围'),
        ('数据已准备好，打开就能体验。', '本机实测已经完成，公开页保留操作证据。'),
    ))

    assets = DESTINATION / "assets"
    for name in ("trek-research-overview-2026-09-22.png", "trek-research-overview-vector.svg"):
        copy(PROJECT / "assets" / name, assets / name)
    copy(PROJECT / "site" / "v1-public-placeholder.svg", assets / "v1-public-placeholder.svg")
    for asset in (PROJECT / "assets").glob("real-*.png"):
        copy(asset, DESTINATION / asset.name)

    notes = DESTINATION / "notes"
    for source in (PROJECT / "notes").glob("*.md"):
        copy(source, notes / source.name)
    copy(PROJECT / "notes" / "trek-overview-image-prompt.txt", notes / "trek-overview-image-prompt.txt")
    copy(PROJECT / "notes" / "trek-overview-export.html", notes / "trek-overview-export.html")
    readme = (PROJECT / "README.md").read_text(encoding="utf-8")
    readme = readme.replace("(../../README.md)", "(../)")
    (DESTINATION / "README.md").write_text(readme, encoding="utf-8", newline="\n")
    (DESTINATION / "research.md").write_text(readme, encoding="utf-8", newline="\n")
    copy(PROJECT / "notes" / "README.md", DESTINATION / "notes.md")
    archive = DESTINATION / "archives" / "2026-09-22-v1-185446"
    archive.mkdir(parents=True)
    archive_readme = (PROJECT / "archives" / "2026-09-22-v1-185446" / "README.md").read_text(encoding="utf-8")
    archive_readme = re.sub(r"!\[[^]]*\]\(screenshots/[^)]*\)",
                            "（截图仅保存在本地归档；旧图的公开使用范围尚待核实。）", archive_readme)
    (archive / "README.md").write_text(archive_readme, encoding="utf-8", newline="\n")

    publish_design()
    print(f"Built {DESTINATION.relative_to(ROOT)}: overview, original study, public V1 summary, D0/E1/E2. Local runtime and V1 art excluded.")


if __name__ == "__main__":
    main()
