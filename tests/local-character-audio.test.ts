import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';
import { characterAudioURL } from '../apps/web/src/characterAudio';

test('every character in the complete local curriculum has a bundled WAV recording', () => {
  const design = JSON.parse(readFileSync('课程设计/1000字课程.json', 'utf8'));
  const characters = new Set<string>(design.lessons.flatMap((lesson: { words: { character: string }[] }) => lesson.words.map(word => word.character)));
  expect(characters.size).toBe(1000);
  for (const character of characters) {
    expect(characterAudioURL(character), character).toBeTruthy();
    const bytes = readFileSync(`apps/web/src/character-audio/${character.codePointAt(0)!.toString(16)}.wav`);
    expect(bytes.toString('ascii', 0, 4)).toBe('RIFF');
    expect(bytes.toString('ascii', 8, 12)).toBe('WAVE');
    expect(bytes.length).toBeGreaterThan(4096);
  }
});
