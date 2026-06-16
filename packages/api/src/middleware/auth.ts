import { FastifyRequest, FastifyReply } from 'fastify';
import jwt from 'jsonwebtoken';

export interface AuthPayload {
  userId: string;
  email: string;
  name: string;
  roles: string[];
  workspaceId?: string;
}

export async function authMiddleware(request: FastifyRequest, reply: FastifyReply) {
  const authHeader = request.headers['authorization'];

  if (!authHeader) {
    return reply.code(401).send({ error: 'Missing authorization header' });
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return reply.code(401).send({ error: 'Invalid authorization format. Use: Bearer <token>' });
  }

  const token = parts[1];
  const jwtSecret = (request.server as any).jwtSecret || 'soropreflight-dev-secret';

  try {
    const decoded = jwt.verify(token, jwtSecret) as AuthPayload;
    (request as any).user = decoded;
  } catch {
    return reply.code(401).send({ error: 'Invalid or expired token' });
  }
}
