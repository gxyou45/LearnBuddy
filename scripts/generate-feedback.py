"""Original, short, gently enveloped answer sounds; no external audio assets."""
import math
import struct
import wave
from pathlib import Path

RATE = 22050
ROOT = Path(__file__).resolve().parents[1] / 'apps/web/public/assets/audio'

def write(name, notes, duration):
    samples = [0.0] * int(RATE * duration)
    for start, length, frequency, amplitude in notes:
        for offset in range(int(RATE * length)):
            t = offset / RATE
            # Smooth attack/release avoids clicks; a quiet harmonic adds warmth.
            envelope = min(1.0, t / 0.015) * min(1.0, (length - t) / 0.075)
            tone = math.sin(2 * math.pi * frequency * t) + 0.15 * math.sin(4 * math.pi * frequency * t)
            index = int(start * RATE) + offset
            if index < len(samples):
                samples[index] += amplitude * envelope * tone
    with wave.open(str(ROOT / (name + '.wav')), 'wb') as wav:
        wav.setparams((1, 2, RATE, 0, 'NONE', 'not compressed'))
        wav.writeframes(b''.join(struct.pack('<h', round(max(-1, min(1, value)) * 32767)) for value in samples))

# A short rising chime for success; a lower, softer descending pair for retry.
write('answer-correct', [(0, .18, 659.25, .17), (.13, .25, 880, .16)], .42)
write('answer-incorrect', [(0, .17, 392, .15), (.14, .22, 329.63, .13)], .40)
