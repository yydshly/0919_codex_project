"""Fetch pinned official GIF previews and convert them to compact, seekable MP4s."""
from concurrent.futures import ThreadPoolExecutor
import hashlib
import json
from pathlib import Path
import subprocess
from urllib.request import urlopen

PROJECT = Path(__file__).resolve().parents[1]
ROOT = PROJECT.parents[1]
COMMIT = 'd88456a8d3609994d15954947a3e1e9fb3444552'
BASE = f'https://raw.githubusercontent.com/jd-opensource/JoyAI-Video-Edit/{COMMIT}'
CACHE = ROOT / '.local/joyai-showcase-media'
OUT = PROJECT / 'assets/media'


def prepare(name):
    url = f'{BASE}/assets/cases/{name}.gif'
    cached = CACHE / f'{name}.gif'
    if not cached.exists():
        with urlopen(url, timeout=90) as response:
            cached.write_bytes(response.read())
    target = OUT / f'{name}.mp4'
    subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y',
                    '-i', str(cached), '-an', '-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2',
                    '-c:v', 'libx264', '-preset', 'slow', '-crf', '22',
                    '-pix_fmt', 'yuv420p', '-movflags', '+faststart', str(target)], check=True)
    subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y',
                    '-i', str(target), '-frames:v', '1', '-q:v', '3',
                    str(OUT / f'{name}.jpg')], check=True)
    probe = json.loads(subprocess.check_output(['ffprobe', '-v', 'error',
                       '-show_entries', 'format=duration:stream=width,height',
                       '-of', 'json', str(target)], text=True))
    return dict(name=name, source=url, sha256=hashlib.sha256(cached.read_bytes()).hexdigest(),
                preview=f'media/{name}.mp4', bytes=target.stat().st_size,
                duration=float(probe['format']['duration']), **probe['streams'][0])


if __name__ == '__main__':
    CACHE.mkdir(parents=True, exist_ok=True)
    OUT.mkdir(parents=True, exist_ok=True)
    names = [f'case{i:02}_{side}' for i in range(1, 6) for side in ('source', 'edited')]
    with ThreadPoolExecutor(max_workers=4) as pool:
        records = list(pool.map(prepare, names))
    (PROJECT / 'assets/media-manifest.json').write_text(json.dumps({
        'upstream_commit': COMMIT,
        'notice': 'Official GIF previews transcoded to MP4; no local model inference. No audio in source GIFs.',
        'assets': records}, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    with urlopen(f'{BASE}/LICENSE', timeout=60) as response:
        (PROJECT / 'assets/UPSTREAM-LICENSE').write_bytes(response.read())
    print(json.dumps(records, indent=2))
