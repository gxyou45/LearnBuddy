import { characterSoundGroups } from './character-sounds.js';

const sounds = new Map(characterSoundGroups.flatMap(group => group.map(text => [text, group[0]] as const)));
export const characterSoundKey = (text: string) => sounds.get(text) ?? text;
type Option = { id: string; text: string; word: string };

/** Preserve the target, exclude indistinguishable answers and deduplicate distractors. */
export function learningOptions<T extends Option>(options: readonly T[], targetId: string | undefined, kind: string): T[] {
  if (!targetId || !['sound', 'meaning'].includes(kind)) return [...options];
  const target = options.find(option => option.id === targetId);
  if (!target) throw new Error(`Missing question target: ${targetId}`);
  const key = (option: T) => kind === 'sound' ? characterSoundKey(option.text) : option.word;
  const seen = new Set([key(target)]);
  return options.filter(option => {
    if (option.id === targetId) return true;
    const value = key(option);
    if (seen.has(value)) return false;
    seen.add(value);
    return true;
  });
}
