import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { streamSSE } from 'hono/streaming';

import { getTournament, initStore, saveTournament } from './store.js';

type StreamWriter = (data: string) => void;

const roomStreams = new Map<string, Set<StreamWriter>>();

function addStream(roomCode: string, write: StreamWriter): void {
  const code = roomCode.toUpperCase();
  if (!roomStreams.has(code)) {
    roomStreams.set(code, new Set());
  }
  roomStreams.get(code)?.add(write);
}

function removeStream(roomCode: string, write: StreamWriter): void {
  roomStreams.get(roomCode.toUpperCase())?.delete(write);
}

function broadcastTournament(roomCode: string, payload: unknown): void {
  const data = JSON.stringify(payload);
  roomStreams.get(roomCode.toUpperCase())?.forEach((write) => write(data));
}

const app = new Hono();

app.use(
  '*',
  cors({
    origin: '*',
    allowMethods: ['GET', 'PUT', 'OPTIONS'],
  })
);

app.get('/health', (c) => c.json({ ok: true, service: 'poker-asso-sync' }));

app.get('/api/tournaments/:roomCode/stream', (c) => {
  const roomCode = c.req.param('roomCode').toUpperCase();

  return streamSSE(c, async (stream) => {
    const write: StreamWriter = (data) => {
      void stream.writeSSE({ data });
    };

    addStream(roomCode, write);

    const initial = getTournament(roomCode);
    if (initial) {
      await stream.writeSSE({ data: JSON.stringify(initial) });
    }

    const heartbeat = setInterval(() => {
      void stream.writeSSE({ event: 'ping', data: '' });
    }, 25000);

    await new Promise<void>((resolve) => {
      stream.onAbort(() => {
        clearInterval(heartbeat);
        removeStream(roomCode, write);
        resolve();
      });
    });
  });
});

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
  broadcastTournament(roomCode, saved);
  return c.json(saved);
});

const port = Number(process.env.PORT) || 3001;

await initStore();

serve(
  {
    fetch: app.fetch,
    port,
    hostname: '0.0.0.0',
  },
  (info) => {
    console.log(`Poker Asso sync server listening on http://0.0.0.0:${info.port}`);
  }
);
