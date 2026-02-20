import type { FastifyInstance } from 'fastify';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { readSessions } from '../../core/todoReader.js';
import { buildContextHealth } from '../../core/contextHealth.js';
import type { WatchEvent } from '../watcher.js';
import type { EventEmitter } from 'events';

export interface LiveRouteOptions {
  claudeDir: string;
  agentScopeDir?: string;
  emitter: EventEmitter;
}

export async function liveRoutes(fastify: FastifyInstance, opts: LiveRouteOptions): Promise<void> {
  const { claudeDir, agentScopeDir, emitter } = opts;
  const sseClients = new Set<(event: WatchEvent) => void>();
  let lastSessions: string | null = null;

  emitter.on('change', (event: WatchEvent) => {
    if (event.type === 'sessions') lastSessions = new Date().toISOString();
    for (const send of sseClients) send(event);
  });

  fastify.get('/health', async () => {
    const hasLive = existsSync(join(claudeDir, 'tasks')) || existsSync(join(claudeDir, 'todos'));
    const hasPlan = agentScopeDir ? existsSync(join(agentScopeDir, 'queue.md')) : false;
    return {
      status: 'ok',
      modes: { live: hasLive, plan: hasPlan },
      connectedClients: sseClients.size,
      lastSessions,
    };
  });

  fastify.get('/events', async (_request, reply) => {
    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*'
    });
    reply.raw.write(`data: ${JSON.stringify({ type: 'connected', timestamp: new Date().toISOString() })}\n\n`);

    const send = (event: WatchEvent) => {
      reply.raw.write(`data: ${JSON.stringify(event)}\n\n`);
    };
    sseClients.add(send);

    const pingInterval = setInterval(() => {
      reply.raw.write(`: ping\n\n`);
    }, 30000);

    _request.raw.on('close', () => {
      sseClients.delete(send);
      clearInterval(pingInterval);
    });

    await new Promise(() => {});
  });

  // Read session-meta enrichment data if available
  function readSessionMeta(sessionId: string): { linesAdded?: number; gitCommits?: number; languages?: Record<string, number>; durationMinutes?: number } | null {
    const metaPath = join(claudeDir, 'usage-data', 'session-meta', `${sessionId}.json`);
    if (!existsSync(metaPath)) return null;
    try {
      const raw = readFileSync(metaPath, 'utf8');
      const m = JSON.parse(raw) as Record<string, unknown>;
      return {
        linesAdded: typeof m.lines_added === 'number' ? m.lines_added : undefined,
        gitCommits: typeof m.git_commits === 'number' ? m.git_commits : undefined,
        languages: m.languages && typeof m.languages === 'object' ? m.languages as Record<string, number> : undefined,
        durationMinutes: typeof m.duration_minutes === 'number' ? m.duration_minutes : undefined,
      };
    } catch { return null; }
  }

  fastify.get<{ Querystring: { model?: string } }>('/sessions', async (request) => {
    const model = request.query.model;
    const sessions = readSessions(claudeDir).map(s => ({
      ...s,
      contextHealth: buildContextHealth(s, model),
      ...readSessionMeta(s.id),
    }));
    return { sessions };
  });

  fastify.get<{ Params: { id: string }; Querystring: { model?: string } }>('/sessions/:id', async (request) => {
    const sessions = readSessions(claudeDir);
    const found = sessions.find(s => s.id === request.params.id);
    if (!found) return { session: null, error: 'Session not found' };
    const model = request.query.model;
    return { session: { ...found, contextHealth: buildContextHealth(found, model) } };
  });

  fastify.post<{ Params: { id: string } }>('/sessions/:id/resume-cmd', async (request, reply) => {
    const { id } = request.params;
    const sessions = readSessions(claudeDir);
    const found = sessions.find(s => s.id === id);
    if (!found) return reply.code(404).send({ error: 'Session not found' });
    return { command: `claude resume ${id}`, sessionId: id };
  });
}
