import { getSteps, lessons as sourceLessons, themes as sourceThemes, contentVersion as sourceContentVersion } from './content';
import type { Catalog, LessonPackage } from '@learnbuddy/contracts';

export const staticReleaseId = 'curriculum-1000-v1';

// The static preview uses the same authored curriculum, but gives the runtime
// local URLs for its public audio. The hashes only satisfy the package shape;
// no server or private media endpoint is involved in this build.
function hash(index: number) {
  return index.toString(16).padStart(64, '0');
}

function audioAsset(id: string, index: number) {
  return {
    id: `audio-${id}`,
    kind: 'audio' as const,
    objectKey: `assets/audio/${hash(index)}.wav`,
    sha256: hash(index),
    bytes: 1,
    mimeType: 'audio/wav' as const,
    source: 'LearnBuddy static preview',
    reviewStatus: 'pending' as const,
    durationMs: 1000,
    text: id,
  };
}

function imageAsset(id: string, index: number) {
  return {
    id,
    kind: 'image' as const,
    objectKey: `assets/images/${hash(index)}.png`,
    sha256: hash(index),
    bytes: 1,
    mimeType: 'image/png' as const,
    source: 'LearnBuddy static preview',
    reviewStatus: 'pending' as const,
  };
}

const audioIds = [...new Set([
  'meaning',
  'hunt',
  ...sourceLessons.flatMap(lesson => [
    lesson.introAudio,
    lesson.story.audio,
    ...lesson.characters.flatMap(character => [character.audio, `word-${character.id}`]),
    ...getSteps(lesson).map(step => step.audio),
  ]),
])];

const audioAssets = audioIds.map((id, index) => audioAsset(id, index + 1));
const imageAssets = sourceLessons.flatMap((lesson, index) => [
  imageAsset(`image-lesson-${lesson.id}`, 100 + index),
  imageAsset(`image-scene-${lesson.id}`, 200 + index),
]);
const assets = [...audioAssets, ...imageAssets];

export const staticCatalog: Catalog = {
  apiVersion: 1,
  releaseId: staticReleaseId,
  contentVersion: sourceContentVersion,
  themes: sourceThemes.map((theme, order) => ({ ...theme, id: `theme-${order}`, order })),
  lessons: sourceLessons.map(lesson => ({
    id: lesson.id,
    title: lesson.title,
    theme: lesson.theme,
    intro: lesson.intro,
    image: { id: `image-lesson-${lesson.id}`, url: `/media/assets/images/${hash(100 + sourceLessons.indexOf(lesson))}.png` },
    characters: lesson.characters,
    stepIndex: getSteps(lesson).map(({ id, kind, characterId }) => ({ id, kind, ...(characterId ? { characterId } : {}) })),
  })),
};

export function staticLessonPackage(id: string): LessonPackage {
  const lesson = sourceLessons.find(item => item.id === id);
  if (!lesson) throw new Error(`Unknown static lesson: ${id}`);
  const sceneAsset = `image-scene-${lesson.id}`;
  const requiredAudio = [...new Set([
    lesson.introAudio,
    lesson.story.audio,
    ...lesson.characters.flatMap(character => [character.audio, `word-${character.id}`]),
    ...getSteps(lesson).map(step => step.audio),
  ])];
  const packageAssets = [
    ...requiredAudio.map(audio => assets.find(asset => asset.id === `audio-${audio}`)!),
    assets.find(asset => asset.id === `image-lesson-${lesson.id}`)!,
    assets.find(asset => asset.id === sceneAsset)!,
  ].map(asset => ({ ...asset, url: `/media/${asset.objectKey}` }));
  return {
    apiVersion: 1,
    releaseId: staticReleaseId,
    contentVersion: sourceContentVersion,
    lesson: { ...lesson, steps: getSteps(lesson), imageAssetId: `image-lesson-${lesson.id}` },
    assets: packageAssets,
    scene: {
      id: `scene-${lesson.id}`,
      imageAssetId: sceneAsset,
      themeIds: [`theme-${lesson.theme}`],
      description: '静态试用版花园场景',
      slots: [
        { id: 'kite', x: 22, y: 24, clue: '看看天上的小风筝。' },
        { id: 'sign', x: 72, y: 51, clue: '看看小屋旁边的木牌。' },
        { id: 'pot', x: 32, y: 80, clue: '看看花丛旁边的小花盆。' },
      ],
    },
    characterImages: {},
  };
}

export function staticAssetURL(id: string) {
  if (id.startsWith('audio-')) return `${import.meta.env.BASE_URL}assets/audio/${id.slice('audio-'.length)}.wav`;
  return `${import.meta.env.BASE_URL}assets/static-preview.png`;
}
