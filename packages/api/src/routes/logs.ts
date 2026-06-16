import { FastifyInstance } from 'fastify';
import { authMiddleware } from '../middleware/auth';
import { rbacMiddleware } from '../middleware/rbac';

interface LogEntry {
  id: string;
  timestamp: string;
  userId: string;
  action: string;
  resource: string;
  details: string;
}

interface PaginatedResponse<T> {
  entries: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 200;

export async function logsRoutes(server: FastifyInstance) {
  server.get('/logs', {
    preHandler: [authMiddleware, rbacMiddleware(['admin', 'owner'])],
  }, async (request, reply) => {
    const query = request.query as {
      page?: string;
      limit?: string;
      userId?: string;
      action?: string;
      resource?: string;
      from?: string;
      to?: string;
    };

    const page = Math.max(1, parseInt(query.page || '1', 10) || 1);
    const limit = Math.min(MAX_PAGE_SIZE, Math.max(1, parseInt(query.limit || String(DEFAULT_PAGE_SIZE), 10) || DEFAULT_PAGE_SIZE));

    const result: PaginatedResponse<LogEntry> = {
      entries: [],
      total: 0,
      page,
      limit,
      hasMore: false,
    };

    return reply.code(200).send(result);
  });
}
