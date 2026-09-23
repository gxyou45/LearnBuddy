"""Generate local prototype audio with macOS Tingting; publishing requires review."""
import json
import subprocess
from pathlib import Path
root = Path(__file__).resolve().parents[1]
for name, text in json.loads((root / 'scripts/audio-texts.json').read_text()).items():
    target = root / 'apps/web/public/assets/audio' / (name + '.wav')
    if target.exists():
        continue
    subprocess.run(['say', '-v', 'Tingting', '-r', '140', '-o', str(target), '--data-format=LEI16@22050', text], check=True)
    print(name, flush=True)
