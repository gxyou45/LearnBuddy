"""Build the web client's single-character audio for previously published lessons.

Run on macOS: python3 scripts/curriculum/prepare-character-audio.py
The database and historical lesson packages remain unchanged.
"""
from concurrent.futures import ThreadPoolExecutor
import json
from pathlib import Path
import shutil
import subprocess
import tempfile
import wave

ROOT = Path(__file__).resolve().parents[2]
source = json.loads((ROOT / 'curriculum-release/manifest.json').read_text())
preview = ROOT / 'apps/web/public/static-content'
preview_assets = json.loads((preview / 'manifest.json').read_text())['assets']
available = {a['text']: preview / 'files' / a['objectKey'] for a in preview_assets
             if a['kind'] == 'audio' and len(a.get('text', '')) == 1}
output = ROOT / 'apps/web/src/character-audio'
output.mkdir(parents=True, exist_ok=True)
characters = sorted({c['text'] for lesson in source['lessons'] for c in lesson['characters']})


def prepare(character):
    target = output / f'{ord(character):x}.wav'
    if not target.exists():
        if character in available:
            shutil.copyfile(available[character], target)
        else:
            with tempfile.TemporaryDirectory(prefix='learnbuddy-single-') as temporary:
                recording = Path(temporary) / 'character.wav'
                subprocess.run(['say', '-v', 'Tingting', '-r', '140', '-o', str(recording),
                                '--data-format=LEI16@22050', character], check=True)
                with wave.open(str(recording)) as audio:
                    assert audio.getnchannels() == 1 and audio.getsampwidth() == 2
                    assert any(audio.readframes(audio.getnframes())), character
                shutil.copyfile(recording, target)
    return character


with ThreadPoolExecutor(max_workers=4) as pool:
    for index, character in enumerate(pool.map(prepare, characters), 1):
        if index % 50 == 0:
            print(f'Prepared {index}/{len(characters)} character recordings', flush=True)
