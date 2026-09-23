"""Build the dependency-free showcase into the shared GitHub Pages directory."""
from pathlib import Path
import shutil

PROJECT = Path(__file__).resolve().parents[1]
ROOT = PROJECT.parents[1]
DESTINATION = ROOT / 'web' / PROJECT.name


def main():
    required = [PROJECT / 'assets/media' / f'case{i:02}_{side}.{ext}'
                for i in range(1, 6) for side in ('source', 'edited') for ext in ('mp4', 'jpg')]
    required += [PROJECT / 'assets/live' / name for name in (
        'live_optimus_prime.jpg', 'live_gundam.jpg', 'live_cartoon_group.jpg',
        'live_cel_anime.jpg', 'live_hanfu_palace.jpg', 'reference-outfits.mp4',
        'reference-outfits.jpg')]
    missing = [str(path.relative_to(PROJECT)) for path in required if not path.is_file()]
    if missing:
        raise SystemExit('Missing media; run scripts/prepare_media.py first: ' + ', '.join(missing))
    DESTINATION.mkdir(parents=True, exist_ok=True)
    for name in ('index.html', 'styles.css', 'app.js', 'favicon.svg'):
        shutil.copy2(PROJECT / 'site' / name, DESTINATION / name)
    shutil.copytree(PROJECT / 'assets/media', DESTINATION / 'media', dirs_exist_ok=True)
    shutil.copytree(PROJECT / 'assets/live', DESTINATION / 'live', dirs_exist_ok=True)
    for name in ('UPSTREAM-LICENSE', 'media-manifest.json', 'extra-media-manifest.json'):
        shutil.copy2(PROJECT / 'assets' / name, DESTINATION / name)
    if (PROJECT / 'assets/cover.png').exists():
        shutil.copy2(PROJECT / 'assets/cover.png', DESTINATION / 'cover.png')
    for name in ('joyai-capability-overview.svg', 'joyai-capability-overview.png',
                 'joyai-capability-overview-v2.svg', 'joyai-capability-overview-v2.png'):
        shutil.copy2(PROJECT / 'assets' / name, DESTINATION / name)
    readme = (PROJECT / 'README.md').read_text(encoding='utf-8')
    readme = readme.replace('(../../README.md)', '(../)').replace('(assets/cover.png)', '(cover.png)')
    readme = readme.replace('(notes/README.md)', '(notes.md)').replace('(assets/UPSTREAM-LICENSE)', '(UPSTREAM-LICENSE)')
    readme = readme.replace('(assets/media-manifest.json)', '(media-manifest.json)')
    readme = readme.replace('(assets/extra-media-manifest.json)', '(extra-media-manifest.json)')
    readme = readme.replace('(assets/joyai-capability-overview.svg)', '(joyai-capability-overview.svg)')
    readme = readme.replace('(assets/joyai-capability-overview.png)', '(joyai-capability-overview.png)')
    readme = readme.replace('(assets/joyai-capability-overview-v2.svg)', '(joyai-capability-overview-v2.svg)')
    readme = readme.replace('(assets/joyai-capability-overview-v2.png)', '(joyai-capability-overview-v2.png)')
    (DESTINATION / 'research.md').write_text(readme, encoding='utf-8', newline='\n')
    shutil.copy2(PROJECT / 'notes/README.md', DESTINATION / 'notes.md')
    print(f'Built {DESTINATION.relative_to(ROOT)}: 5 video pairs, 5 official screenshots, 1 reference video.')


if __name__ == '__main__':
    main()
