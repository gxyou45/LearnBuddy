import entries from './word-visuals.json';
export type WordVisualSpec={kind:'emoji'|'scene'|'sketch'|'color'|'count'|'symbol';value:string;description?:string};
const exact:Readonly<Record<string,WordVisualSpec>>=entries as Record<string,WordVisualSpec>;
/** Whole word only: 香甜 must never inherit 香蕉's banana, and 海洋 is not a dolphin. */
export function wordVisual(word:string):WordVisualSpec|undefined{return exact[word];}
