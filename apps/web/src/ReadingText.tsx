import { useSyncExternalStore } from 'react';
import { getPlayback, subscribePlayback } from './audio';
import { readingTimings } from './contentRepository';
import {readingPosition} from '@learnbuddy/contracts';

export function ReadingText({ text, audio }: { text: string; audio: string }) {
  const playback = useSyncExternalStore(subscribePlayback, getPlayback);
  const timing = readingTimings[audio];
  const matching = playback?.id === audio && timing?.text === text;
  const {current,read}=matching?readingPosition(timing,playback.time):{current:-1,read:-1};
  return <span className="reading-text" aria-label={text}>
    {Array.from(text).map((character, index) => <span aria-hidden="true" key={index}
      className={`reading-character${matching && (playback.ended || index <= read) ? ' is-read' : ''}${matching && !playback.ended && index === current ? ' is-current' : ''}`}>{character}</span>)}
  </span>;
}
