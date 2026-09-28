// Vite fingerprints recordings so corrections cannot reuse stale browser audio.
const recordings = import.meta.glob<string>('./character-audio/*.wav', { query: '?url', import: 'default', eager: true });
export function characterAudioURL(text: string): string | undefined {
  if (Array.from(text).length !== 1) return undefined;
  return recordings[`./character-audio/${text.codePointAt(0)!.toString(16)}.wav`];
}
