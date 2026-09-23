"""Build the static text summary of the ebook directory research."""
from pathlib import Path
import shutil

PROJECT = Path(__file__).resolve().parents[1]
ROOT = PROJECT.parents[1]
DESTINATION = ROOT / 'web' / PROJECT.name


def main():
    DESTINATION.mkdir(parents=True, exist_ok=True)
    for name in ('index.html', 'styles.css', 'favicon.svg'):
        shutil.copy2(PROJECT / 'site' / name, DESTINATION / name)
    readme = (PROJECT / 'README.md').read_text(encoding='utf-8')
    readme = readme.replace('(../../README.md)', '(../)')
    readme = readme.replace('(../../web/007-ebook-treasure-chest/)', '(./)')
    readme = readme.replace('(notes/README.md)', '(notes.md)')
    (DESTINATION / 'research.md').write_text(readme, encoding='utf-8', newline='\n')
    notes = (PROJECT / 'notes' / 'README.md').read_text(encoding='utf-8')
    notes = notes.replace('(../README.md)', '(research.md)')
    (DESTINATION / 'notes.md').write_text(notes, encoding='utf-8', newline='\n')
    shutil.copy2(PROJECT / 'project.json', DESTINATION / 'project.json')
    print(f'Built {DESTINATION.relative_to(ROOT)}.')


if __name__ == '__main__':
    main()
