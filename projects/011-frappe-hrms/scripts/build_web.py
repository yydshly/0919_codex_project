"""Build the dependency-free Frappe HR educational demo."""
from pathlib import Path
import shutil

PROJECT = Path(__file__).resolve().parents[1]
ROOT = PROJECT.parents[1]
DEST = ROOT / 'web' / PROJECT.name


def main():
    DEST.mkdir(parents=True, exist_ok=True)
    for filename in ('index.html', 'styles.css', 'app.mjs', 'core.mjs', 'favicon.svg',
                     'knowledge.css', 'knowledge.mjs', 'knowledge-data.mjs', 'capability-map.svg', 'map.html'):
        shutil.copy2(PROJECT / 'site' / filename, DEST / filename)
    text = (PROJECT / 'README.md').read_text(encoding='utf-8')
    text = text.replace('(../../README.md)', '(../)').replace('(notes/README.md)', '(notes.md)').replace('(assets/cover.png)', '(demo-cover.png)')
    text = text.replace('(site/map.html)', '(map.html)').replace('(assets/capability-map.svg)', '(capability-map.svg)')
    (DEST / 'research.md').write_text(text, encoding='utf-8', newline='\n')
    shutil.copy2(PROJECT / 'notes' / 'README.md', DEST / 'notes.md')
    cover = PROJECT / 'assets' / 'capability-map.png'
    if cover.exists():
        shutil.copy2(cover, DEST / 'cover.png')
    shutil.copy2(PROJECT / 'assets' / 'cover.png', DEST / 'demo-cover.png')
    for filename in ('real-hrms-payroll.png', 'real-hrms-payment-days.png', 'capability-map.png'):
        source = PROJECT / 'assets' / filename
        if source.exists():
            shutil.copy2(source, DEST / filename)
    (DEST / 'runtime').mkdir(exist_ok=True)
    runtime = (PROJECT / 'runtime' / 'README.md').read_text(encoding='utf-8')
    runtime = runtime.replace('../assets/', '../')
    (DEST / 'runtime' / 'README.md').write_text(runtime, encoding='utf-8', newline='\n')
    print(f'Built {DEST.relative_to(ROOT)}')


if __name__ == '__main__':
    main()
