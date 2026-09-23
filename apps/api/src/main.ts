import {replayDeletions} from './data-management.js';
import {createAuth,authConfig} from './auth.js';
import { serve } from '@hono/node-server';
import { database } from './db.js';
import { createApp } from './app.js';
const db = database();
await replayDeletions(db);
const config=authConfig();
const auth=createAuth(db,config);
const server = serve({ fetch: createApp(db,auth,config.origins).fetch, port: Number(process.env.PORT || 3000), hostname: '0.0.0.0' });
let stopping = false;
function shutdown() {
 if (stopping) return;
 stopping = true;
 const timeout = setTimeout(() => process.exit(1), 10000);
 timeout.unref();
 server.close(async () => { await db.$disconnect(); clearTimeout(timeout); });
}
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
