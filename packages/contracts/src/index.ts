import { z } from 'zod';

export type CharacterId = string;
export type Character = { id: CharacterId; text: string; word: string; example: string; icon: string; audio: string; audioText?: string };
export type Story = { text: string; audio: string; note: string; supportCharacters: string[]; question?: string; answer?: string };
export type Lesson = { id: string; title: string; theme: number; intro: string; introAudio: string; characters: Character[]; story: Story; lifeTask: string; reviewTasks?: string[] };
export type Step = { id: string; kind: 'intro' | 'teach' | 'word' | 'sound' | 'meaning' | 'hunt' | 'story'; characterId?: CharacterId; title: string; subtitle: string; audio: string };

const id = z.string().regex(/^[a-z0-9][a-z0-9-]*$/);
const assetId = z.string().regex(/^(audio|image)-[a-z0-9-]+$/);
const step = z.object({ id, kind: z.enum(['intro','teach','word','sound','meaning','hunt','story']), characterId: id.optional(), title: z.string().min(1), subtitle: z.string(), audio: id });
const character = z.object({ id, text: z.string().min(1), word: z.string().min(1), example: z.string(), icon: z.string(), audio: id, audioText: z.string().min(1).optional() });
const story = z.object({ text: z.string().min(1), audio: id, note: z.string(), supportCharacters: z.array(z.string()), question: z.string().optional(), answer: z.string().optional() });
export const manifestSchema = z.object({
  schemaVersion: z.literal(1), contentVersion: z.number().int().positive(), releaseId: id,
  themes: z.array(z.object({ id, title: z.string(), subtitle: z.string(), icon: z.string(), order: z.number().int().nonnegative() })),
  lessons: z.array(z.object({ id, title: z.string(), theme: z.number().int().nonnegative(), intro: z.string(), introAudio: id, characters: z.array(character).min(3).max(5), story, lifeTask: z.string(), reviewTasks: z.array(z.string()).optional(), steps: z.array(step), imageAssetId: assetId })),
  assets: z.array(z.object({
    id: assetId, kind: z.enum(['audio', 'image']), objectKey: z.string().regex(/^assets\/(audio|images)\/[a-f0-9]{64}\.(wav|svg|png)$/),
    sha256: z.string().regex(/^[a-f0-9]{64}$/), bytes: z.number().int().positive(), mimeType: z.enum(['audio/wav', 'image/svg+xml', 'image/png']),
    source: z.string(), reviewStatus: z.literal('pending'),
    durationMs: z.number().positive().optional(), text: z.string().optional(),
    cues: z.object({ text: z.string(), starts: z.array(z.number().nonnegative()), status: z.literal('estimated') }).optional(),
  })),
  huntScenes: z.array(z.object({ id, imageAssetId: assetId, themeIds: z.array(id), description: z.string(), slots: z.array(z.object({ id, x: z.number().min(0).max(100), y: z.number().min(0).max(100), clue: z.string() })) })),
});
export type ContentManifest = z.infer<typeof manifestSchema>;
export type ImportedAsset = ContentManifest['assets'][number];

export function validateManifest(input: unknown): ContentManifest {
  const data = manifestSchema.parse(input);
  const unique = (values: string[], name: string) => { if (new Set(values).size !== values.length) throw new Error(`Duplicate ${name}`); };
  unique(data.themes.map(t => t.id), 'theme');
  unique(data.themes.map(t => String(t.order)), 'theme order');
  unique(data.lessons.map(l => l.id), 'lesson');
  unique(data.assets.map(a => a.id), 'asset');
  unique(data.huntScenes.map(s => s.id), 'scene');
  unique(data.lessons.flatMap(l => l.characters.map(c => c.id)), 'character');
  const assets = new Map(data.assets.map(a => [a.id, a]));
  const requireAsset = (key: string, kind: 'audio' | 'image') => {
    const asset = assets.get(key);
    if (!asset || asset.kind !== kind) throw new Error(`Missing ${kind}: ${key}`);
  };
  for (const lesson of data.lessons) {
    if (!data.themes.some(t => t.order === lesson.theme)) throw new Error(`Missing theme: ${lesson.id}`);
    unique(lesson.steps.map(s => s.id), `step in ${lesson.id}`);
    requireAsset(lesson.imageAssetId, 'image');
    requireAsset(`audio-${lesson.introAudio}`, 'audio');
    requireAsset(`audio-${lesson.story.audio}`, 'audio');
    if (assets.get(`audio-${lesson.story.audio}`)?.text !== lesson.story.text) throw new Error(`Story transcript mismatch: ${lesson.id}`);
    for (const c of lesson.characters) {
      requireAsset(`audio-${c.audio}`, 'audio');
      requireAsset(`audio-word-${c.id}`, 'audio');
    }
    for (const s of lesson.steps) {
      requireAsset(`audio-${s.audio}`, 'audio');
      if (s.characterId && !lesson.characters.some(c => c.id === s.characterId)) throw new Error(`Foreign character in ${s.id}`);
    }
  }
  for (const a of data.assets) {
    if (a.kind === 'audio' && (!a.durationMs || a.mimeType !== 'audio/wav')) throw new Error(`Invalid audio metadata: ${a.id}`);
    if (a.kind === 'image' && !['image/svg+xml','image/png'].includes(a.mimeType)) throw new Error(`Invalid image metadata: ${a.id}`);
    if (a.cues) {
      if (a.text !== a.cues.text || a.cues.starts.length !== Array.from(a.cues.text).length) throw new Error(`Cue text mismatch: ${a.id}`);
      if (a.cues.starts.some((t, i) => (i > 0 && t < a.cues!.starts[i - 1]) || t * 1000 > (a.durationMs ?? 0))) throw new Error(`Invalid cue time: ${a.id}`);
    }
  }
  for (const scene of data.huntScenes) {
    requireAsset(scene.imageAssetId, 'image');
    unique(scene.slots.map(s => s.id), `slot in ${scene.id}`);
    if (scene.themeIds.some(id => !data.themes.some(t => t.id === id))) throw new Error(`Missing scene theme: ${scene.id}`);
  }
  return data;
}

export type ContentInventory = {
  phase: 'ARC-03'; releaseId: string | null; contentVersion: number | null;
  counts: { themes: number; lessons: number; characters: number; words: number; stories: number; steps: number; assets: number; scenes: number };
  lessons: { id: string; title: string; characters: string[]; story: string }[];
  reviewStatus: 'pending'; frontendDataSource: 'api';
};

export const catalogSchema = z.object({
 apiVersion: z.literal(1), releaseId: id, contentVersion: z.number().int().positive(),
 themes: manifestSchema.shape.themes,
 lessons: z.array(z.object({id,title:z.string(),theme:z.number().int(),intro:z.string(),image:z.object({id:assetId,url:z.string().regex(/^\/media\/assets\/images\/[a-f0-9]{64}\.(svg|png)$/)}),characters:z.array(character),stepIndex:z.array(step.pick({id:true,kind:true,characterId:true}))})).min(1),
});
export type Catalog = z.infer<typeof catalogSchema>;
export const lessonPackageSchema = z.object({
 apiVersion:z.literal(1),releaseId:id,contentVersion:z.number().int(),
 lesson:manifestSchema.shape.lessons.element,
 assets:z.array(manifestSchema.shape.assets.element.extend({url:z.string().regex(/^\/media\/assets\/(audio|images)\/[a-f0-9]{64}\.(wav|svg|png)$/)})),
 scene:manifestSchema.shape.huntScenes.element,
 characterImages:z.record(z.string(),z.string()),
});
export type LessonPackage = z.infer<typeof lessonPackageSchema>;

export const learnerInputSchema = z.object({nickname:z.string().trim().min(1).max(20)}).strict();
export const learnerSchema = z.object({id:z.uuid(),nickname:z.string(),createdAt:z.string().datetime()});
export const familySchema = z.object({account:z.object({accountId:z.uuid(),email:z.email(),role:z.enum(['parent','admin']),cleanupToken:z.uuid().optional()}),learners:z.array(learnerSchema),deletedLearnerIds:z.array(z.uuid()).optional()});
export type LearnerProfile = z.infer<typeof learnerSchema>;
export type FamilyAccount = z.infer<typeof familySchema>;

// ACC-02: online commands. Offline batching/import is a separate, later protocol.
const revisionSchema=z.number().int().nonnegative();
export const startLearningSchema=z.object({requestId:z.uuid(),releaseId:id,lessonId:id,mode:z.enum(['lesson','review']),questionVersionId:z.string().min(1).max(200).optional()}).strict();
const eventBase={clientEventId:z.uuid(),sessionId:z.uuid(),expectedRevision:revisionSchema};
export const learningEventSchema=z.discriminatedUnion('type',[
 z.object({...eventBase,type:z.literal('advance')}).strict(),
 z.object({...eventBase,type:z.literal('answer'),presentationId:z.uuid(),selectedId:id.nullable(),skipped:z.boolean()}).strict(),
 z.object({...eventBase,type:z.literal('hint'),presentationId:z.uuid()}).strict(),
 z.object({...eventBase,type:z.literal('audio'),presentationId:z.uuid(),result:z.enum(['played','failed'])}).strict(),
 z.object({...eventBase,type:z.literal('hunt'),characterId:id}).strict(),
]);
export type LearningCommand=z.infer<typeof learningEventSchema>;
export type StartLearning=z.infer<typeof startLearningSchema>;
export const learningPresentationSchema=z.object({id:z.uuid(),questionVersionId:z.string(),options:z.array(z.object({id,text:z.string(),word:z.string(),icon:z.string()})),prompted:z.boolean(),audioHeard:z.boolean(),audioFailed:z.boolean(),answer:z.object({selectedId:id.nullable(),correct:z.boolean(),skipped:z.boolean(),prompted:z.boolean(),audioFailed:z.boolean(),independent:z.boolean()}).nullable()});
export const learningSessionSchema=z.object({id:z.uuid(),lessonId:id,releaseId:id,mode:z.enum(['lesson','review']),revision:revisionSchema,stepIndex:z.number().int().nonnegative(),stepId:id,completed:z.boolean(),huntFound:z.array(id),presentation:learningPresentationSchema.nullable()});
export type LearningSessionState=z.infer<typeof learningSessionSchema>;
export const learningProgressSchema=z.object({learnerId:z.uuid(),revision:revisionSchema,releaseId:id.nullable(),timeZone:z.string(),activeSessionId:z.uuid().nullable(),openAllCourses:z.boolean(),sessions:z.array(learningSessionSchema),completedLessons:z.array(id),skills:z.array(z.object({targetId:id,kind:z.enum(['sound','meaning']),status:z.enum(['practice','consolidating','stable']),wrongCount:z.number().int(),dueDate:z.string(),ruleVersion:z.number().int()})),characters:z.array(z.object({id,status:z.enum(['未开始','已接触','练习中','较稳定'])})),seen:z.array(id)});
export type LearningProgressState=z.infer<typeof learningProgressSchema>;
export const learningResultSchema=z.object({accepted:z.enum(['applied','duplicate']),session:learningSessionSchema,progress:learningProgressSchema});
export const reviewQueueSchema=z.object({today:z.string(),timeZone:z.string(),items:z.array(z.object({targetId:id,kind:z.enum(['sound','meaning']),dueDate:z.string(),lessonId:id,releaseId:id,questionVersionId:z.string(),ruleVersion:z.number().int()}))});
export type ReviewQueue=z.infer<typeof reviewQueueSchema>;
export const mistakeListSchema=z.object({nextCursor:z.uuid().nullable(),items:z.array(z.object({id:z.uuid(),questionVersionId:z.string(),targetId:id,kind:z.string(),status:z.string(),wrongCount:z.number().int(),lastWrongAt:z.string(),releaseId:id,lessonId:id,selectedId:id.nullable(),correctIds:z.array(id),options:learningPresentationSchema.shape.options}))});
export type MistakeList=z.infer<typeof mistakeListSchema>;

// ACC-03: durable, ordered streams. A receipt is not an application acknowledgement.
export const syncPrepareSchema=z.object({streamId:z.uuid(),sessionId:z.uuid()}).strict();
export const syncEnvelopeSchema=z.object({seq:z.number().int().min(1).max(10000),occurredAt:z.string().datetime(),timeZone:z.string().min(1).max(80),command:learningEventSchema}).strict();
export const syncBatchSchema=z.object({streamId:z.uuid(),events:z.array(syncEnvelopeSchema).max(100)}).strict();
export type SyncEnvelope=z.infer<typeof syncEnvelopeSchema>;
export const syncPlanSchema=z.object({streamId:z.uuid(),nextSeq:z.number().int(),session:learningSessionSchema,presentations:z.record(z.string(),learningPresentationSchema),progress:learningProgressSchema});
export type SyncPlan=z.infer<typeof syncPlanSchema>;
export const syncReceiptSchema=z.object({seq:z.number().int(),clientEventId:z.uuid(),status:z.enum(['buffered','applied','conflict','rejected']),message:z.string().nullable()});
export const syncResultSchema=z.object({nextSeq:z.number().int(),receipts:z.array(syncReceiptSchema),session:learningSessionSchema,progress:learningProgressSchema});
export const learningChangesSchema=z.object({cursor:revisionSchema,reset:z.boolean(),progress:learningProgressSchema.optional(),patch:learningProgressSchema.partial().optional(),deleted:z.object({sessionIds:z.array(z.uuid())})});
const legacyPosition=z.object({stepId:z.string().max(100).optional(),started:z.boolean(),completed:z.boolean(),step:z.number().int().min(0).max(100),session:z.string().max(200),huntFound:z.array(id).max(30).default([])}).strict();
export const legacyProgressSchema=legacyPosition.extend({schemaVersion:z.literal(1),contentVersion:z.number().int().min(1).max(4),releaseId:id.optional(),activeLesson:id.default('family'),lessonProgress:z.record(id,legacyPosition).default({}),unlocked:z.array(id).max(1000).default([]),sound:z.boolean(),seen:z.array(id).max(1000),observations:z.record(id,z.string().max(1000)),attempts:z.array(z.object({id:z.string().max(200),session:z.string().max(200),step:z.string().max(100),characterId:id,kind:z.enum(['sound','meaning']),correct:z.boolean(),hintUsed:z.boolean(),skipped:z.boolean(),date:z.string().regex(/^\d{4}-\d{2}-\d{2}$/),timestamp:z.number().finite()})).max(30000)}).strict();
export const legacyImportSchema=z.object({source:z.literal('legacy_import'),progress:legacyProgressSchema}).strict();
export type LegacyProgress=z.infer<typeof legacyProgressSchema>;

// R7 privacy controls. Deletion requires explicit target text and password re-verification.
export const deletionRequestSchema=z.object({requestId:z.uuid(),confirmation:z.string().min(1).max(254),password:z.string().min(1).max(128)}).strict();
export const deletionReceiptSchema=z.object({requestId:z.uuid(),scope:z.enum(['learner','account']),accountId:z.uuid(),learnerIds:z.array(z.uuid()),deletedAt:z.string().datetime()});
export const deletionStatusSchema=z.object({accountId:z.uuid(),cleanupToken:z.uuid()}).strict();
export const dataExportSchema=z.object({format:z.literal('learnbuddy-family-export'),version:z.literal(1),exportedAt:z.string().datetime(),account:z.object({id:z.uuid(),name:z.string(),email:z.email(),createdAt:z.string().datetime()}),learners:z.array(z.object({profile:z.record(z.string(),z.json()),sessions:z.array(z.record(z.string(),z.json())),progress:z.array(z.record(z.string(),z.json())),completedLessons:z.array(z.record(z.string(),z.json())),skills:z.array(z.record(z.string(),z.json())),mistakes:z.array(z.record(z.string(),z.json())),imports:z.array(z.record(z.string(),z.json())),syncStreams:z.array(z.record(z.string(),z.json()))})),notice:z.string()});

/** Strict append-only compatibility: every prior lesson, theme and asset is unchanged. */
export function isCompatibleExpansion(next:ContentManifest,previous:ContentManifest):boolean {
 const canonical=(v:unknown):string=>Array.isArray(v)?'['+v.map(canonical).join(',')+']':v&&typeof v==='object'?'{'+Object.entries(v).sort(([a],[b])=>a.localeCompare(b)).map(([k,x])=>JSON.stringify(k)+':'+canonical(x)).join(',')+'}':JSON.stringify(v);
 return next.contentVersion===previous.contentVersion && next.lessons.length>previous.lessons.length
  && previous.lessons.every((l,i)=>canonical(l)===canonical(next.lessons[i]))
  && previous.themes.every((t,i)=>canonical(t)===canonical(next.themes[i]))
  && previous.assets.every(a=>canonical(a)===canonical(next.assets.find(n=>n.id===a.id)))
  && previous.huntScenes.every(s=>canonical(s)===canonical(next.huntScenes.find(n=>n.id===s.id)));
}
