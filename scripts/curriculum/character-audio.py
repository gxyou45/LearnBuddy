"""Replace word aliases with single-character recordings in a generated package.

Usage: python3 scripts/curriculum/character-audio.py <package-directory>
Existing word recordings and content-addressed files are preserved.
"""
import hashlib
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import wave


def repair(directory):
    manifest_path = directory / 'manifest.json'
    manifest = json.loads(manifest_path.read_text())
    assets = {asset['id']: asset for asset in manifest['assets']}
    changed = 0
    for lesson in manifest['lessons']:
        for character in lesson['characters']:
            asset = assets['audio-' + character['audio']]
            if asset.get('text') == character['text']:
                continue
            word = assets['audio-word-' + character['id']]
            assert word['text'] == character['word']
            with tempfile.TemporaryDirectory(prefix='learnbuddy-character-') as temporary:
                recording = Path(temporary) / 'character.wav'
                subprocess.run(['say', '-v', 'Tingting', '-r', '140', '-o', str(recording),
                                '--data-format=LEI16@22050', character['text']], check=True)
                data = recording.read_bytes()
                with wave.open(str(recording)) as audio:
                    assert audio.getnchannels() == 1 and audio.getsampwidth() == 2
                    duration = audio.getnframes() / audio.getframerate() * 1000
                    assert any(audio.readframes(audio.getnframes())), character['text']
            digest = hashlib.sha256(data).hexdigest()
            key = f'assets/audio/{digest}.wav'
            target = directory / 'files' / key
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes(data)
            asset.update(objectKey=key, sha256=digest, bytes=len(data), durationMs=duration,
                         text=character['text'], reviewStatus='pending',
                         cues=dict(text=character['text'], starts=[0], status='estimated'))
            character['audioText'] = character['text']
            for step in lesson['steps']:
                if step.get('characterId') != character['id']:
                    continue
                if step['kind'] == 'teach':
                    step['audio'] = character['audio']
                    step['subtitle'] = '听一听这个字，再跟着读一读。'
                elif step['kind'] == 'sound':
                    # This exercise still explicitly asks the child to hear a word.
                    step['audio'] = 'word-' + character['id']
            changed += 1
            print(f'{changed}: {character["text"]}', flush=True)
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, separators=(',', ':')) + '\n')
    print(f'Updated {changed} character recordings in {directory}', flush=True)


if __name__ == '__main__':
    repair(Path(sys.argv[1]))
