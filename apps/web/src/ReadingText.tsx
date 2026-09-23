import { useSyncExternalStore } from 'react';
import { getPlayback, subscribePlayback } from './audio';
import { readingTimings } from './contentRepository';

export function ReadingText({ text, audio }: { text: string; audio: string }) {
  const playback = useSyncExternalStore(subscribePlayback, getPlayback);
  const timing = readingTimings[audio];
  const matching = playback?.id === audio && timing?.text === text;
  let current = -1;
  if (matching) timing.starts.forEach((start, index) => { if (start <= playback.time) current = index; });
  return <span className="reading-text" aria-label={text}>
    {Array.from(text).map((character, index) => <span aria-hidden="true" key={index}
      className={`reading-character${matching && (playback.ended || index <= current) ? ' is-read' : ''}${matching && !playback.ended && index === current ? ' is-current' : ''}`}>{character}</span>)}
  </span>;
}
