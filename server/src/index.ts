import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';

import { getTournament, initStore, saveTournament } from './store.js';

const app = new Hono();

app.use(
  '*',
  cors({
    origin: '*',
    allowMethods: ['GET', 'PUT', 'OPTIONS'],
  })
);

app.get('/health', (c) => c.json({ ok: true, service: 'poker-asso-sync' }));

app.get('/api/tournaments/:roomCode', (c) => {
  const roomCode = c.req.param('roomCode').toUpperCase();
  const tournament = getTournament(roomCode);
  if (!tournament) {
    return c.json({ error: 'not_found' }, 404);
  }
  return c.json(tournament);
});

app.put('/api/tournaments/:roomCode', async (c) => {
  const roomCode = c.req.param('roomCode').toUpperCase();
  let body: { roomCode?: string; updatedAt?: number };

  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'invalid_json' }, 400);
  }

  if (!body.roomCode || body.roomCode.toUpperCase() !== roomCode) {
    return c.json({ error: 'room_mismatch' }, 400);
  }

  if (typeof body.updatedAt !== 'number') {
    return c.json({ error: 'invalid_updated_at' }, 400);
  }

  const saved = saveTournament(body as Parameters<typeof saveTournament>[0]);
  return c.json(saved);
});

const port = Number(process.env.PORT) || 3001;

await initStore();

serve(
  {
    fetch: app.fetch,
    port,
  },
  (info) => {
    console.log(`Poker Asso sync server listening on http://localhost:${info.port}`);
  }
);
