import { cp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const sourceDir = resolve(root, 'curriculum-release');
const outputDir = resolve(root, 'apps/web/public/static-content');
const manifest = JSON.parse(await readFile(resolve(sourceDir, 'manifest.json'), 'utf8'));
const lessons = manifest.lessons.slice(0, 50);
if (lessons.length < 50) throw new Error(`Expected at least 50 lessons, found ${lessons.length}`);

const themeIds = new Set(lessons.map(lesson => manifest.themes.find(theme => theme.order === lesson.theme)?.id));
const scenes = manifest.huntScenes.filter(scene => scene.themeIds.some(id => themeIds.has(id)));
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
await writeFile(resolve(outputDir, 'manifest.json'), `${JSON.stringify(outputManifest)}\n`);

for (const asset of assets) {
  const source = resolve(sourceDir, 'files', asset.objectKey);
  const target = resolve(outputDir, 'files', asset.objectKey);
  await mkdir(dirname(target), { recursive: true });
  await cp(source, target);
}

console.log(`Prepared ${lessons.length} lessons and ${assets.length} assets in ${outputDir}`);
