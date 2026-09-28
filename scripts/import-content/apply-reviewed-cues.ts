import {readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {applyReviewedCues,validateManifest} from '../../packages/contracts/src/index';

const [source,registry,target]=process.argv.slice(2);
if(!source||!registry||!target)throw new Error('Usage: node --import tsx scripts/import-content/apply-reviewed-cues.ts SOURCE_MANIFEST REVIEWED_JSON NEW_MANIFEST');
if(resolve(source)===resolve(target))throw new Error('Write a new manifest; never overwrite the source release');
const manifest=validateManifest(JSON.parse(await readFile(source,'utf8')));
manifest.assets=applyReviewedCues(manifest.assets,JSON.parse(await readFile(registry,'utf8')));
validateManifest(manifest);
await writeFile(target,JSON.stringify(manifest,null,2)+'\n',{flag:'wx'});
console.log(`Applied reviewed cues to ${target}; assign a new release ID before publishing.`);
