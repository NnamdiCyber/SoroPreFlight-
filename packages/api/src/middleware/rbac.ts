import { FastifyRequest, FastifyReply } from 'fastify';
import { AuthPayload } from './auth';

const ROLE_HIERARCHY: Record<string, number> = {
  viewer: 0,
  developer: 1,
  admin: 2,
  owner: 3,
};

export function rbacMiddleware(allowedRoles: string[]) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const user = (request as any).user as AuthPayload | undefined;

    if (!user) {
      return reply.code(401).send({ error: 'Authentication required' });
    }

    const userMaxRole = Math.max(
      ...user.roles.map(r => ROLE_HIERARCHY[r] ?? -1),
    );

    const minAllowed = Math.min(
      ...allowedRoles.map(r => ROLE_HIERARCHY[r] ?? Infinity),
    );

    if (userMaxRole < minAllowed) {
      return reply.code(403).send({
        error: 'Forbidden',
        message: `Insufficient permissions. Required one of: ${allowedRoles.join(', ')}`,
      });
    }
  };
}
