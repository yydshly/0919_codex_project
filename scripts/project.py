#!/usr/bin/env python3
"""Create numbered research projects and keep the root README in sync."""

import argparse
import html
import json
from pathlib import Path
import re
import shutil
import sys
from urllib.parse import quote, unquote, urlparse


ROOT = Path(__file__).resolve().parents[1]
STATUSES = {"待研究", "研究中", "已复现", "已完成", "已归档"}
SLUG = re.compile(r"[a-z0-9]+(?:-[a-z0-9]+)*")


def require(condition, message):
    if not condition:
        raise ValueError(message)


def valid_url(value):
    parsed = urlparse(value)
    return (parsed.scheme == "https" and bool(parsed.hostname)
            and not parsed.username and not parsed.password
            and not any(c.isspace() for c in value))


def read_projects():
    projects = []
    ids, slugs = set(), set()
    for directory in sorted((ROOT / "projects").iterdir()):
        if not directory.is_dir() or directory.name.startswith("."):
            continue
        path = directory / "project.json"
        require(path.is_file(), f"Missing metadata: {path.relative_to(ROOT)}")
        item = json.loads(path.read_text(encoding="utf-8"))
        require(isinstance(item, dict), f"Metadata must be an object: {path}")
        for field in ("id", "slug", "name", "summary", "source", "status", "demo", "cover"):
            require(isinstance(item.get(field), str), f"{directory.name}: invalid {field}")
            require(not any(c in item[field] for c in "\r\n"),
                    f"{directory.name}: {field} must be a single line")
        require(re.fullmatch(r"[0-9]{3}", item["id"]) and item["id"] != "000",
                f"{directory.name}: id must be 001..999")
        require(SLUG.fullmatch(item["slug"]), f"{directory.name}: invalid slug")
        require(directory.name == f"{item['id']}-{item['slug']}",
                f"{directory.name}: directory and metadata disagree")
        require(item["id"] not in ids, f"Duplicate id: {item['id']}")
        require(item["slug"] not in slugs, f"Duplicate slug: {item['slug']}")
        require(item["name"].strip() and item["summary"].strip(),
                f"{directory.name}: name and summary are required")
        require(item["status"] in STATUSES, f"{directory.name}: invalid status")
        require(valid_url(item["source"]), f"{directory.name}: invalid source HTTPS URL")
        require(not item["demo"] or valid_url(item["demo"]),
                f"{directory.name}: invalid demo HTTPS URL")
        require(isinstance(item.get("tags"), list)
                and all(isinstance(tag, str) and tag.strip()
                        and not any(c in tag for c in "\r\n") for tag in item["tags"]),
                f"{directory.name}: tags must be a list of nonempty strings")
        require((directory / "README.md").is_file(), f"{directory.name}: missing README.md")
        if item["cover"]:
            cover = (directory / item["cover"]).resolve()
            require(not Path(item["cover"]).is_absolute()
                    and "\\" not in item["cover"]
                    and cover.is_relative_to(directory.resolve()) and cover.is_file(),
                    f"{directory.name}: cover must be an existing image inside the project")
            require(cover.suffix.lower() in {".png", ".jpg", ".jpeg", ".webp", ".gif", ".svg"},
                    f"{directory.name}: unsupported cover format")
        ids.add(item["id"])
        slugs.add(item["slug"])
        projects.append(item)
    return sorted(projects, key=lambda item: int(item["id"]))


def md(value):
    value = html.escape(value, quote=False)
    for character in "\\`*_{}[]()#+.!|":
        value = value.replace(character, "\\" + character)
    return value


def url(value):
    return quote(value, safe="/:?=&%#@+~,;-$")


def render_readme(projects):
    readme = (ROOT / "README.md").read_text(encoding="utf-8")
    rows, cards = [], []
    for item in projects:
        directory = f"projects/{item['id']}-{item['slug']}"
        name = md(item["name"])
        demo = f"[演示]({url(item['demo'])})" if item["demo"] else "—"
        tags = "、".join(md(tag) for tag in item["tags"]) or "—"
        source = urlparse(item["source"])
        source_name = unquote(source.path.rstrip("/").split("/")[-1]).removesuffix(".git") or source.hostname
        rows.append(f"| {item['id']} | [{name}]({directory}/README.md) | "
                    f"{md(item['summary'])} | {item['status']} | {tags} | "
                    f"[{md(source_name)}]({url(item['source'])}) | {demo} |")
        if item["cover"]:
            cards.append(f"### {item['id']} · [{name}]({directory}/README.md)\n\n"
                         f"{md(item['summary'])}\n\n"
                         f"[![{name} 项目截图]({url(directory + '/' + item['cover'])})]"
                         f"({directory}/README.md)")
    index = ("| 编号 | 项目 | 摘要 | 状态 | 标签 | 源库 | 演示 |\n"
             "| --- | --- | --- | --- | --- | --- | --- |\n" + "\n".join(rows)) if rows else (
                 "暂无研究项目。首个项目将从 **001** 开始。")
    gallery = "\n\n".join(cards) or "添加项目封面后，这里会自动展示项目图片与摘要。"
    for section, content in (("PROJECT_INDEX", index), ("PROJECT_GALLERY", gallery)):
        start, end = f"<!-- {section}:START -->", f"<!-- {section}:END -->"
        require(readme.count(start) == readme.count(end) == 1,
                f"README must contain exactly one {section} marker pair")
        require(readme.index(start) < readme.index(end), f"Reversed {section} markers")
        before, rest = readme.split(start)
        _, after = rest.split(end)
        readme = before + start + "\n" + content + "\n" + end + after
    return readme


def sync(check=False):
    projects = read_projects()
    expected = render_readme(projects)
    path = ROOT / "README.md"
    if check:
        require(path.read_text(encoding="utf-8") == expected,
                "README is out of date. Run: python scripts/project.py sync")
        print(f"OK: {len(projects)} project(s); metadata and README are consistent.")
    else:
        path.write_text(expected, encoding="utf-8", newline="\n")
        print(f"Synced {len(projects)} project(s).")


def add(args):
    require(SLUG.fullmatch(args.slug), "Use lowercase letters, digits and single hyphens for slug.")
    require(valid_url(args.source), "Source must be an HTTPS URL.")
    require(all(value.strip() and not any(c in value for c in "\r\n")
                for value in (args.name, args.summary)), "Name and summary must be nonempty single lines.")
    projects = read_projects()
    render_readme(projects)  # Validate the destination markers before creating files.
    require(not any(item["slug"] == args.slug for item in projects), "This slug already exists.")
    number = max((int(item["id"]) for item in projects), default=0) + 1
    require(number <= 999, "Three-digit index is full; expand the numbering scheme first.")
    identifier = f"{number:03d}"
    destination = ROOT / "projects" / f"{identifier}-{args.slug}"
    require(not destination.exists(), f"Directory already exists: {destination}")
    shutil.copytree(ROOT / "templates" / "project", destination)
    item = dict(id=identifier, slug=args.slug, name=args.name.strip(),
                summary=args.summary.strip(), source=args.source, status="待研究",
                tags=[], demo="", cover="")
    (destination / "project.json").write_text(
        json.dumps(item, ensure_ascii=False, indent=2) + "\n", encoding="utf-8", newline="\n")
    readme_path = destination / "README.md"
    replacements = {"ID": identifier, "NAME": md(item["name"]),
                    "SUMMARY": md(item["summary"]), "SOURCE": url(args.source)}
    readme = re.sub(r"\{\{(ID|NAME|SUMMARY|SOURCE)\}\}",
                    lambda match: replacements[match[1]], readme_path.read_text(encoding="utf-8"))
    readme_path.write_text(readme, encoding="utf-8", newline="\n")
    sync()
    print(f"Created projects/{destination.name}")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    commands = parser.add_subparsers(dest="command", required=True)
    create = commands.add_parser("add", help="Create the next numbered research project")
    create.add_argument("slug")
    create.add_argument("--name", required=True)
    create.add_argument("--source", required=True)
    create.add_argument("--summary", required=True)
    commands.add_parser("sync", help="Regenerate the root README index and gallery")
    commands.add_parser("check", help="Validate metadata and check for an out-of-date README")
    args = parser.parse_args()
    try:
        if args.command == "add":
            add(args)
        else:
            sync(check=args.command == "check")
    except (ValueError, OSError) as error:
        print(f"Error: {error}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
