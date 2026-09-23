"""Package the exact corresponding demo sources; exclude generated and local files."""
from pathlib import Path
import sys
import zipfile

root = Path(__file__).resolve().parents[1]
output = Path(sys.argv[1])
with zipfile.ZipFile(output / 'source.zip', 'w', zipfile.ZIP_DEFLATED) as archive:
    for entry in ['site', 'vendor', 'scripts', 'notes']:
        for path in sorted((root / entry).rglob('*')):
            if path.is_file() and '__pycache__' not in path.parts:
                archive.write(path, path.relative_to(root))
    for name in ['README.md', 'package.json', 'package-lock.json', 'vite.config.js']:
        archive.write(root / name, name)
print('Packaged corresponding source and licenses.')
