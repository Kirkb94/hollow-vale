"""Reapply reviewed wing anchors after regenerating character manifests."""
import json
from pathlib import Path

root = Path(__file__).resolve().parents[1]
fixes = json.loads((root / 'design/animation/wing-attachment-corrections.json').read_text(encoding='utf-8'))
for key, correction in fixes.items():
    path = root / 'public/art/rigs' / key / 'manifest.json'
    manifest = json.loads(path.read_text(encoding='utf-8'))
    for direction, wings in correction['views'].items():
        view = (manifest['creature']['views'][direction]['parts'] if correction['creature']
                else manifest['extras']['views'][direction])
        for name, fields in wings.items():
            view[name].update(fields)
    path.write_text(json.dumps(manifest, indent=2) + '\n', encoding='utf-8')
