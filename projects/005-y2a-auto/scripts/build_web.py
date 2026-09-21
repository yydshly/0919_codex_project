"""Build the static research page; no third-party libraries, no fake deployment."""
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

    cover = PROJECT / 'assets' / 'capability-overview.svg'
    if cover.is_file():
        shutil.copy2(cover, DESTINATION / 'pipeline.svg')

    for name in ('y2a-auto-panorama.png', 'y2a-auto-panorama.svg'):
        asset = PROJECT / 'assets' / name
        if asset.is_file():
            shutil.copy2(asset, DESTINATION / name)

    readme = (PROJECT / 'README.md').read_text(encoding='utf-8')
    readme = readme.replace('(../../README.md)', '(../)')
    readme = readme.replace('(assets/capability-overview.svg)', '(pipeline.svg)')
    readme = readme.replace('(assets/y2a-auto-panorama.png)', '(y2a-auto-panorama.png)')
    readme = readme.replace('(assets/y2a-auto-panorama.svg)', '(y2a-auto-panorama.svg)')
    readme = readme.replace('(notes/README.md)', '(notes.md)')
    (DESTINATION / 'research.md').write_text(readme, encoding='utf-8', newline='\n')

    notes = (PROJECT / 'notes/README.md').read_text(encoding='utf-8')
    notes = notes.replace('(../README.md)', '(research.md)')
    notes = notes.replace('../../../README.md', '../')
    notes = notes.replace('../../README.md', '../')
    notes = notes.replace('../002-brightbean-studio/README.md', '../002-brightbean-studio/')
    notes = notes.replace('../001-video-shotcraft/README.md', '../001-video-shotcraft/')
    notes = notes.replace('../003-llm-foundations-agent-kernel/README.md', '../003-llm-foundations-agent-kernel/')
    notes = notes.replace('../004-blinko/README.md', '../004-blinko/')
    (DESTINATION / 'notes.md').write_text(notes, encoding='utf-8', newline='\n')

    print(f'Built {DESTINATION.relative_to(ROOT)} (static page, no third-party deps).')


if __name__ == '__main__':
    main()
