"""Build the static research page; never copy application data or credentials."""
import html
import json
from pathlib import Path
import shutil

PROJECT = Path(__file__).resolve().parents[1]
ROOT = PROJECT.parents[1]
DESTINATION = ROOT / 'web' / PROJECT.name


def main():
    metadata = json.loads((PROJECT / 'project.json').read_text(encoding='utf-8'))
    DESTINATION.mkdir(parents=True, exist_ok=True)
    template = (PROJECT / 'site/index.html').read_text(encoding='utf-8')
    (DESTINATION / 'index.html').write_text(
        template.replace('__SUMMARY__', html.escape(metadata['summary'], quote=True)),
        encoding='utf-8', newline='\n')
    for name in ('styles.css', 'favicon.svg'):
        shutil.copy2(PROJECT / 'site' / name, DESTINATION / name)
    shutil.copy2(PROJECT / 'assets/cover.png', DESTINATION / 'cover.png')
    readme = (PROJECT / 'README.md').read_text(encoding='utf-8')
    readme = readme.replace('(../../README.md)', '(../)')
    readme = readme.replace('(assets/cover.png)', '(cover.png)')
    readme = readme.replace('(notes/README.md)', '(notes.md)')
    (DESTINATION / 'research.md').write_text(readme, encoding='utf-8', newline='\n')
    notes = (PROJECT / 'notes/README.md').read_text(encoding='utf-8')
    notes = notes.replace('(loopback-only.patch)',
        '(https://github.com/yydshly/0919_codex_project/blob/main/projects/004-blinko/notes/loopback-only.patch)')
    (DESTINATION / 'notes.md').write_text(notes, encoding='utf-8', newline='\n')
    print(f'Built {DESTINATION.relative_to(ROOT)} (static page and actual screenshot).')


if __name__ == '__main__':
    main()
