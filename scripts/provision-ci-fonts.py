"""Reassemble licensed fonts from encrypted GitHub secrets inside a CI runner."""
import base64
import hashlib
import io
import json
import os
from pathlib import Path
import zipfile

os.umask(0o077)
parts = [os.environ.get(f'CP_FONT_BUNDLE_{n:02}', '') for n in range(1, 17)]
expected = os.environ.get('CP_FONT_BUNDLE_SHA256', '').lower()
if not parts[0] or len(expected) != 64:
    raise SystemExit('Configure the private font bundle parts and SHA-256 secret.')
try:
    data = base64.b64decode(''.join(parts), validate=True)
except Exception:
    raise SystemExit('Invalid private font bundle encoding.')
if len(data) > 50_000_000 or hashlib.sha256(data).hexdigest() != expected:
    raise SystemExit('Private font bundle size or checksum verification failed.')
font_dir = Path(os.environ['RUNNER_TEMP']) / 'cp-render-fonts'
font_dir.mkdir(mode=0o700, parents=True, exist_ok=True)
names = {'headline': ('Futura.ttc', 'Futura-Medium'),
         'subhead': ('ProximaNova-Semibold.otf', 'ProximaNova-Semibold'),
         'body': ('ProximaNova-Regular.otf', 'ProximaNova-Regular')}
config = {}
with zipfile.ZipFile(io.BytesIO(data)) as archive:
    for role, (filename, postscript) in names.items():
        info = archive.getinfo(filename)
        if info.file_size > 25_000_000:
            raise SystemExit('Font file exceeds the provisioning limit.')
        target = font_dir / filename
        target.write_bytes(archive.read(info))
        target.chmod(0o600)
        config[role] = {'path': str(target), 'postscriptName': postscript}
config_path = font_dir / 'fonts.json'
config_path.write_text(json.dumps(config))
with open(os.environ['GITHUB_ENV'], 'a') as environment:
    environment.write(f'CP_BRAND_FONT_CONFIG={config_path}\n')
