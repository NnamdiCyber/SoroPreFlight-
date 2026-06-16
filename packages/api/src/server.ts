import Fastify from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import jwt from 'jsonwebtoken';
import { simulateRoutes } from './routes/simulate';
import { deployRoutes } from './routes/deploy';
import { logsRoutes } from './routes/logs';
import { workspaceRoutes } from './routes/workspace';
import { authMiddleware } from './middleware/auth';
import { rbacMiddleware } from './middleware/rbac';

export interface ApiServerOptions {
  port?: number;
  host?: string;
  jwtSecret?: string;
  apiKey?: string;
}

const DEFAULT_PORT = 3141;
const DEFAULT_HOST = '0.0.0.0';
const DEFAULT_JWT_SECRET = 'soropreflight-dev-secret';

export async function buildServer(options: ApiServerOptions = {}) {
  const port = options.port || parseInt(process.env['SOROPREFLIGHT_PORT'] || '', 10) || DEFAULT_PORT;
  const host = options.host || process.env['SOROPREFLIGHT_HOST'] || DEFAULT_HOST;
  const jwtSecret = options.jwtSecret || process.env['JWT_SECRET'] || DEFAULT_JWT_SECRET;

  const server = Fastify({
    logger: {
      level: process.env['NODE_ENV'] === 'test' ? 'silent' : 'info',
    },
  });

  await server.register(cors, {
    origin: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  await server.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
  });

  server.decorate('jwtSecret', jwtSecret);

  server.get('/health', async (_request, _reply) => {
    return {
      status: 'ok',
      service: 'soropreflight-api',
      version: '0.1.0',
      timestamp: new Date().toISOString(),
    };
  });

  await server.register(simulateRoutes, { prefix: '/api/v1' });
  await server.register(deployRoutes, { prefix: '/api/v1' });
  await server.register(logsRoutes, { prefix: '/api/v1' });
  await server.register(workspaceRoutes, { prefix: '/api/v1' });

  return { server, port, host };
}

export async function startServer(options: ApiServerOptions = {}) {
  const { server, port, host } = await buildServer(options);

  const gracefulShutdown = async (signal: string) => {
    server.log.info(`Received ${signal}, shutting down gracefully...`);
    await server.close();
    process.exit(0);
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  try {
    await server.listen({ port, host });
    server.log.info(`SoroPreFlight API server listening on ${host}:${port}`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }

  return server;
}

if (require.main === module) {
  startServer();
}
