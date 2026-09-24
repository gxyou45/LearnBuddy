import { manifestSchema, type Catalog, type ContentManifest, type LessonPackage } from '@learnbuddy/contracts';

export const staticReleaseId = 'curriculum-1000-v1';
const assetMap = new Map<string, ContentManifest['assets'][number]>();
let manifest: ContentManifest | undefined;

function assetURLFor(asset: ContentManifest['assets'][number]) {
  return `${import.meta.env.BASE_URL}static-content/files/${asset.objectKey}`;
}

export async function loadStaticCatalog(): Promise<Catalog> {
  const response = await fetch(`${import.meta.env.BASE_URL}static-content/manifest.json`);
  if (!response.ok) throw new Error(`静态课程包暂时无法加载（${response.status}）`);
  manifest = manifestSchema.parse(await response.json());
  assetMap.clear();
  for (const asset of manifest.assets) assetMap.set(asset.id, asset);
  return {
    apiVersion: 1,
    releaseId: manifest.releaseId,
    contentVersion: manifest.contentVersion,
    themes: manifest.themes,
    lessons: manifest.lessons.map(lesson => {
      const image = assetMap.get(lesson.imageAssetId);
      if (!image) throw new Error(`静态课程缺少图片：${lesson.id}`);
      return {
        id: lesson.id,
        title: lesson.title,
        theme: lesson.theme,
        intro: lesson.intro,
        image: { id: lesson.imageAssetId, url: `/media/${image.objectKey}` },
        characters: lesson.characters,
        stepIndex: lesson.steps.map(({ id, kind, characterId }) => ({ id, kind, ...(characterId ? { characterId } : {}) })),
      };
    }),
  };
}

export function staticLessonPackage(id: string): LessonPackage {
  if (!manifest) throw new Error('静态课程目录尚未加载');
  const lesson = manifest.lessons.find(item => item.id === id);
  if (!lesson) throw new Error(`静态课程不存在：${id}`);
  const theme = manifest.themes.find(item => item.order === lesson.theme);
  const scene = theme && manifest.huntScenes.find(item => item.themeIds.includes(theme.id));
  if (!scene) throw new Error(`静态课程缺少找字场景：${id}`);
  const required = new Set<string>([
    lesson.imageAssetId,
    scene.imageAssetId,
    `audio-${lesson.introAudio}`,
    `audio-${lesson.story.audio}`,
    ...lesson.steps.map(step => `audio-${step.audio}`),
    ...lesson.characters.flatMap(character => [`audio-${character.audio}`, `audio-word-${character.id}`]),
  ]);
  const assets = [...required].map(assetId => {
    const asset = assetMap.get(assetId);
    if (!asset) throw new Error(`静态课程缺少素材：${assetId}`);
    return { ...asset, url: `/media/${asset.objectKey}` };
  });
  return {
    apiVersion: 1,
    releaseId: manifest.releaseId,
    contentVersion: manifest.contentVersion,
    lesson,
    assets,
    scene,
    characterImages: {},
  };
}

export function staticAssetURL(id: string) {
  const asset = assetMap.get(id);
  if (!asset) throw new Error(`静态课程缺少素材：${id}`);
  return assetURLFor(asset);
}
