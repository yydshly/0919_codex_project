from pathlib import Path
from datetime import datetime, timezone
import json

ROOT = Path(__file__).resolve().parents[1]
WORKSPACE = ROOT.parents[3]
stamp = datetime.now(timezone.utc).isoformat()
projects = []
for path in sorted((WORKSPACE / 'projects').glob('*/project.json')):
    value = json.loads(path.read_text(encoding='utf-8-sig'))
    projects.append(dict(id=path.parent.name, name=value['name'], summary=value['summary'],
                         source=value['source'], tags=value['tags'], originalStatus=value['status'],
                         snapshotAt=stamp, metadataPath=str(path.relative_to(WORKSPACE)).replace('\\','/')))
(ROOT / 'app').mkdir(exist_ok=True)
(ROOT / 'app/catalog.json').write_text(json.dumps(dict(snapshotAt=stamp, projects=projects), ensure_ascii=False, indent=2), encoding='utf-8')
print(f'Captured {len(projects)} real project records at {stamp}')
