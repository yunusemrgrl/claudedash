import type { FastifyInstance } from 'fastify';
import { readFileSync, existsSync, readdirSync } from 'fs';
import { join, basename } from 'path';
import { readSessions } from '../../core/todoReader.js';
import { detectWorktrees, enrichWorktreeStatus } from '../../core/worktreeDetector.js';
import { mapTasksToWorktrees } from '../../core/worktreeMapper.js';

export interface ObservabilityRouteOptions {
  claudeDir: string;
}

export async function observabilityRoutes(fastify: FastifyInstance, opts: ObservabilityRouteOptions): Promise<void> {
  const { claudeDir } = opts;

  // GET /usage — reads ~/.claude/stats-cache.json (written by Claude Code)
  fastify.get('/usage', async (_req, reply) => {
    const statsPath = join(claudeDir, 'stats-cache.json');
    if (!existsSync(statsPath)) {
      return reply.code(404).send({
        error: 'Usage data not found',
        hint: 'stats-cache.json not found in Claude directory. Run a Claude Code session to generate it.',
      });
    }
    try {
      const raw = readFileSync(statsPath, 'utf8');
      const stats = JSON.parse(raw) as Record<string, unknown>;
      // Return last 7 days of dailyActivity
      const dailyActivity = Array.isArray(stats.dailyActivity) ? stats.dailyActivity : [];
      const last7Days = dailyActivity.slice(-7);
      return {
        totalSessions: stats.totalSessions ?? 0,
        totalMessages: stats.totalMessages ?? 0,
        firstSessionDate: stats.firstSessionDate ?? null,
        longestSession: stats.longestSession ?? null,
        hourCounts: stats.hourCounts ?? {},
        modelUsage: stats.modelUsage ?? {},
        dailyActivity: last7Days,
        lastComputedDate: stats.lastComputedDate ?? null,
      };
    } catch {
      return reply.code(500).send({ error: 'Failed to read stats-cache.json' });
    }
  });

  // GET /activity/sessions — reads ~/.claude/usage-data/session-meta/*.json
  fastify.get('/activity/sessions', async (_req, reply) => {
    const sessionMetaDir = join(claudeDir, 'usage-data', 'session-meta');
    if (!existsSync(sessionMetaDir)) {
      return reply.code(404).send({
        error: 'Session metadata not found',
        hint: 'usage-data/session-meta directory not found.',
      });
    }
    try {
      const files = readdirSync(sessionMetaDir).filter(f => f.endsWith('.json'));
      const sessions: unknown[] = [];
      for (const file of files) {
        try {
          const raw = readFileSync(join(sessionMetaDir, file), 'utf8');
          const meta = JSON.parse(raw) as Record<string, unknown>;
          sessions.push({
            sessionId: meta.session_id ?? basename(file, '.json'),
            projectPath: meta.project_path ?? null,
            projectName: meta.project_path ? basename(String(meta.project_path)) : null,
            startTime: meta.start_time ?? null,
            durationMinutes: meta.duration_minutes ?? null,
            userMessageCount: meta.user_message_count ?? 0,
            assistantMessageCount: meta.assistant_message_count ?? 0,
            toolCounts: meta.tool_counts ?? {},
            languages: meta.languages ?? {},
            gitCommits: meta.git_commits ?? 0,
            gitPushes: meta.git_pushes ?? 0,
            inputTokens: meta.input_tokens ?? 0,
            outputTokens: meta.output_tokens ?? 0,
            linesAdded: meta.lines_added ?? 0,
            firstPrompt: meta.first_prompt ?? null,
            toolErrors: meta.tool_errors ?? 0,
            usesMcp: meta.uses_mcp ?? false,
            usesWebSearch: meta.uses_web_search ?? false,
          });
        } catch {
          // skip malformed files
        }
      }
      // Sort by startTime descending, return last 20
      sessions.sort((a, b) => {
        const aTime = (a as Record<string, unknown>).startTime as string ?? '';
        const bTime = (b as Record<string, unknown>).startTime as string ?? '';
        return bTime.localeCompare(aTime);
      });
      return { sessions: sessions.slice(0, 20), total: sessions.length };
    } catch {
      return reply.code(500).send({ error: 'Failed to read session metadata' });
    }
  });

  fastify.get('/worktrees', async () => {
    try {
      const raw = await detectWorktrees(process.cwd());
      const enriched = await Promise.all(raw.map(w => enrichWorktreeStatus(w)));
      const sessions = readSessions(claudeDir);
      return { worktrees: mapTasksToWorktrees(sessions, enriched) };
    } catch {
      return { worktrees: [] };
    }
  });
}
