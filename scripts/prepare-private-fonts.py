"""Create private runtime mounts and bounded CI secret parts; never prints font data."""
import argparse
import base64
import hashlib
import io
import json
import os
from pathlib import Path
import shutil
import zipfile

parser = argparse.ArgumentParser()
parser.add_argument('--config', default='data/fonts.local.json')
parser.add_argument('--output', default='runtime-private')
args = parser.parse_args()
os.umask(0o077)
config_path = Path(args.config).resolve()
source = json.loads(config_path.read_text())
out = Path(args.output).resolve()
if out.exists():
    raise SystemExit('Output directory already exists; choose a new private directory.')
roles = {'headline': ('Futura.ttc', 'Futura-Medium'),
         'subhead': ('ProximaNova-Semibold.otf', 'ProximaNova-Semibold'),
         'body': ('ProximaNova-Regular.otf', 'ProximaNova-Regular')}
files = {}
for role, (filename, identity) in roles.items():
    if source[role]['postscriptName'] != identity:
        raise SystemExit('Font configuration does not identify the exact CP fonts.')
    src = Path(source[role]['path'])
    src = src if src.is_absolute() else config_path.parent / src
    files[filename] = src.read_bytes()
archive = io.BytesIO()
with zipfile.ZipFile(archive, 'w', zipfile.ZIP_DEFLATED, compresslevel=9) as bundle:
    for filename, data in files.items():
        bundle.writestr(filename, data)
encoded = base64.b64encode(archive.getvalue()).decode('ascii')
parts = [encoded[i:i+32000] for i in range(0, len(encoded), 32000)]
if len(parts) > 16:
    raise SystemExit('Font bundle exceeds the 16-part CI limit.')
for folder in ['fonts', 'config', 'ci-secrets']:
    (out / folder).mkdir(parents=True, mode=0o700)
for filename, data in files.items():
    (out / 'fonts' / filename).write_bytes(data)
config = {role: {'path': '/fonts/'+filename, 'postscriptName': identity}
          for role, (filename, identity) in roles.items()}
(out / 'config' / 'fonts.json').write_text(json.dumps(config, indent=2)+'\n')
(out / 'cp-fonts.zip').write_bytes(archive.getvalue())
for index, part in enumerate(parts, 1):
    (out / 'ci-secrets' / f'CP_FONT_BUNDLE_{index:02}').write_text(part)
(out / 'ci-secrets' / 'CP_FONT_BUNDLE_SHA256').write_text(hashlib.sha256(archive.getvalue()).hexdigest())
manifest = {'fontFiles': list(files), 'parts': len(parts), 'archiveBytes': len(archive.getvalue())}
(out / 'manifest.json').write_text(json.dumps(manifest, indent=2)+'\n')
print(json.dumps({'privateDirectory': str(out), **manifest}))
