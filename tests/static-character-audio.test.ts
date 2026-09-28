import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { expect, test } from 'vitest';
import { manifestSchema } from '../packages/contracts/src/index';

test('static recognition reads single characters while word exercises retain words', () => {
  const root = 'apps/web/public/static-content';
  const manifest = manifestSchema.parse(JSON.parse(readFileSync(`${root}/manifest.json`, 'utf8')));
  const assets = new Map(manifest.assets.map(asset => [asset.id, asset]));
  for (const lesson of manifest.lessons) {
    for (const character of lesson.characters) {
      const teach = lesson.steps.find(step => step.kind === 'teach' && step.characterId === character.id)!;
      const word = lesson.steps.find(step => step.kind === 'word' && step.characterId === character.id)!;
      expect(assets.get(`audio-${teach.audio}`)?.text).toBe(character.text);
      expect(assets.get(`audio-${word.audio}`)?.text).toBe(character.word);
      const audio = assets.get(`audio-${character.audio}`)!;
      expect(audio.cues?.text).toBe(character.text);
      expect(audio.cues?.starts).toHaveLength(Array.from(character.text).length);
      const bytes = readFileSync(`${root}/files/${audio.objectKey}`);
      expect(bytes.length).toBe(audio.bytes);
      expect(createHash('sha256').update(bytes).digest('hex')).toBe(audio.sha256);
      if (lesson.id.startsWith('c')) {
        const sound = lesson.steps.find(step => step.kind === 'sound' && step.characterId === character.id)!;
        expect(assets.get(`audio-${sound.audio}`)?.text).toBe(character.word);
      }
    }
  }
});
