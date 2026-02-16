import Fastify from 'fastify';
import cors from '@fastify/cors';
import staticPlugin from '@fastify/static';
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { parseQueue } from '../core/queueParser.js';
import { parseLog } from '../core/logParser.js';
import { computeSnapshot } from '../core/stateEngine.js';
import type { Snapshot } from '../core/types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export async function startServer(agentScopeDir: string, port: number = 4317): Promise<void> {
  const fastify = Fastify({
    logger: false
  });

  // Enable CORS
  await fastify.register(cors, {
    origin: true
  });

  // Serve static files (dashboard UI)
  const publicPath = join(__dirname, '../public');
  if (existsSync(publicPath)) {
    await fastify.register(staticPlugin, {
      root: publicPath,
      prefix: '/'
    });
  }

  // Health check endpoint
  fastify.get('/health', async () => {
    return { status: 'ok' };
  });

  // Snapshot endpoint
  fastify.get('/snapshot', async () => {
    const queuePath = join(agentScopeDir, 'queue.md');
    const logPath = join(agentScopeDir, 'execution.log');

    // Check if files exist
    if (!existsSync(queuePath)) {
      return {
        snapshot: null,
        queueErrors: ['queue.md not found'],
        logErrors: [],
        meta: {
          generatedAt: new Date().toISOString(),
          totalTasks: 0
        }
      };
    }

    // Read and parse queue
    const queueContent = readFileSync(queuePath, 'utf-8');
    const queueResult = parseQueue(queueContent);

    // If queue has errors, don't compute snapshot
    if (queueResult.errors.length > 0) {
      return {
        snapshot: null,
        queueErrors: queueResult.errors,
        logErrors: [],
        meta: {
          generatedAt: new Date().toISOString(),
          totalTasks: 0
        }
      };
    }

    // Read and parse log
    let logResult = parseLog(''); // Default to empty result
    if (existsSync(logPath)) {
      const logContent = readFileSync(logPath, 'utf-8');
      logResult = parseLog(logContent);
    }

    // Compute snapshot
    let snapshot: Snapshot | null = null;
    try {
      snapshot = computeSnapshot(queueResult.tasks, logResult.events);
    } catch (error) {
      return {
        snapshot: null,
        queueErrors: [`Failed to compute snapshot: ${error}`],
        logErrors: logResult.errors,
        meta: {
          generatedAt: new Date().toISOString(),
          totalTasks: queueResult.tasks.length
        }
      };
    }

    return {
      snapshot,
      queueErrors: [],
      logErrors: logResult.errors,
      meta: {
        generatedAt: new Date().toISOString(),
        totalTasks: queueResult.tasks.length
      }
    };
  });

  // Start server
  try {
    await fastify.listen({ port, host: '0.0.0.0' });
  } catch (err) {
    fastify.log.error(err);
    throw err;
  }
}
