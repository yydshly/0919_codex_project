"""Build the dependency-free research page into the shared Pages directory."""
import shutil
from pathlib import Path

PROJECT = Path(__file__).resolve().parents[1]
ROOT = PROJECT.parents[1]
DEST = ROOT / 'web' / PROJECT.name
DEST.mkdir(parents=True, exist_ok=True)
shutil.copytree(PROJECT / 'site', DEST, dirs_exist_ok=True)
for source, target in [('README.md','research.md'),('notes/README.md','notes.md')]:
    text = (PROJECT/source).read_text(encoding='utf-8')
    text = text.replace('(../../README.md)', '(../)').replace('(notes/README.md)', '(notes.md)').replace('(assets/cover.png)', '(cover.png)').replace('(assets/capability-map.png)', '(capability-map.png)').replace('(assets/capability-map.svg)', '(capability-map.svg)')
    (DEST/target).write_text(text,encoding='utf-8')
if (PROJECT/'assets/cover.png').exists():
    shutil.copy2(PROJECT/'assets/cover.png',DEST/'cover.png')
for name in ('capability-map.png','capability-map.svg'):
    if (PROJECT/'assets'/name).exists():
        shutil.copy2(PROJECT/'assets'/name,DEST/name)
print(f'Built {DEST.relative_to(ROOT)}')
