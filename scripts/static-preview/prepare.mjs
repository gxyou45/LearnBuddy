import { cp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { basename, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const sourceDir = resolve(root, 'curriculum-release');
const outputDir = resolve(root, 'apps/web/public/static-content');
const storyArtSourceDir = resolve(root, 'apps/web/src/story-art');
const storyArtOutputDir = resolve(outputDir, 'story-art');
const manifest = JSON.parse(await readFile(resolve(sourceDir, 'manifest.json'), 'utf8'));
const storyArtBriefs = JSON.parse(await readFile(resolve(storyArtSourceDir, 'briefs.json'), 'utf8'));
const lessons = manifest.lessons.slice(0, 50);
if (lessons.length < 50) throw new Error(`Expected at least 50 lessons, found ${lessons.length}`);
for (const character of lessons.flatMap(lesson => lesson.characters)) {
  const audio = manifest.assets.find(asset => asset.id === `audio-${character.audio}`);
  if (audio?.text !== character.text) {
    throw new Error('Character recordings must read single characters. Run python3 scripts/curriculum/character-audio.py curriculum-release before preparing the static preview.');
  }
}

const themeIds = new Set(lessons.map(lesson => manifest.themes.find(theme => theme.order === lesson.theme)?.id));
const scenes = manifest.huntScenes.filter(scene => scene.themeIds.some(id => themeIds.has(id)));
for(const scene of [...scenes])if(scene.play){
 for(const id of scene.play.sceneIds){const variant=manifest.huntScenes.find(s=>s.id===id);if(!variant)throw new Error(`Missing hunt scene: ${id}`);if(!scenes.some(s=>s.id===id))scenes.push(variant);}
 // A static preview must not quietly lose distractors omitted by its lesson cut.
 const included=new Set(lessons.flatMap(l=>l.characters.map(c=>c.id)));
 if(scene.play.distractorIds.some(id=>!included.has(id)))throw new Error(`Hunt pool exceeds static preview: ${scene.id}`);
}
const assetIds = new Set(['audio-answer-correct', 'audio-answer-incorrect']);
for (const lesson of lessons) {
  assetIds.add(lesson.imageAssetId);
  assetIds.add(`audio-${lesson.introAudio}`);
  assetIds.add(`audio-${lesson.story.audio}`);
  for (const character of lesson.characters) {
    assetIds.add(`audio-${character.audio}`);
    assetIds.add(`audio-word-${character.id}`);
  }
  for (const step of lesson.steps) assetIds.add(`audio-${step.audio}`);
}
for (const scene of scenes) assetIds.add(scene.imageAssetId);

const assets = manifest.assets.filter(asset => assetIds.has(asset.id));
for (const id of assetIds) {
  if (!assets.some(asset => asset.id === id)) throw new Error(`Missing asset in full release: ${id}`);
}

const outputManifest = {
  ...manifest,
  themes: manifest.themes.filter(theme => themeIds.has(theme.id)),
  lessons,
  assets,
  huntScenes: scenes,
};
await mkdir(outputDir, { recursive: true });
await mkdir(storyArtOutputDir, { recursive: true });
await writeFile(resolve(outputDir, 'manifest.json'), `${JSON.stringify(outputManifest)}\n`);

for (const asset of assets) {
  const source = resolve(sourceDir, 'files', asset.objectKey);
  const target = resolve(outputDir, 'files', asset.objectKey);
  await mkdir(dirname(target), { recursive: true });
  await cp(source, target);
}

for (const brief of storyArtBriefs) {
  const source = resolve(storyArtSourceDir, brief.file);
  const target = resolve(storyArtOutputDir, basename(brief.file));
  await cp(source, target);
}

console.log(`Prepared ${lessons.length} lessons, ${assets.length} course assets, and ${storyArtBriefs.length} story illustrations in ${outputDir}`);
