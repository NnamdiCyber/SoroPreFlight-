import { FastifyInstance } from 'fastify';
import { Workspace, WorkspaceMember, Role, User } from '@soropreflight/core';
import { authMiddleware } from '../middleware/auth';
import { rbacMiddleware } from '../middleware/rbac';

const inMemoryWorkspaces: Workspace[] = [];

export async function workspaceRoutes(server: FastifyInstance) {
  server.get('/workspace', {
    preHandler: [authMiddleware, rbacMiddleware(['viewer', 'developer', 'admin', 'owner'])],
  }, async (request, reply) => {
    return reply.code(200).send({ workspaces: inMemoryWorkspaces });
  });

  server.post('/workspace', {
    preHandler: [authMiddleware, rbacMiddleware(['admin', 'owner'])],
  }, async (request, reply) => {
    const body = request.body as { name: string };
    const user = (request as any).user as User;

    const workspace: Workspace = {
      id: `ws-${Date.now()}`,
      name: body.name,
      ownerId: user.id,
      members: [
        {
          userId: user.id,
          role: 'owner',
          joinedAt: new Date().toISOString(),
        },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    inMemoryWorkspaces.push(workspace);
    return reply.code(201).send(workspace);
  });

  server.get('/workspace/:id', {
    preHandler: [authMiddleware, rbacMiddleware(['viewer', 'developer', 'admin', 'owner'])],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const ws = inMemoryWorkspaces.find(w => w.id === id);
    if (!ws) {
      return reply.code(404).send({ error: 'Workspace not found' });
    }
    return reply.code(200).send(ws);
  });

  server.post('/workspace/:id/invite', {
    preHandler: [authMiddleware, rbacMiddleware(['admin', 'owner'])],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as { userId: string; role: Role };
    const ws = inMemoryWorkspaces.find(w => w.id === id);
    if (!ws) {
      return reply.code(404).send({ error: 'Workspace not found' });
    }

    const newMember: WorkspaceMember = {
      userId: body.userId,
      role: body.role,
      joinedAt: new Date().toISOString(),
    };

    ws.members.push(newMember);
    ws.updatedAt = new Date().toISOString();
    return reply.code(200).send(ws);
  });

  server.put('/workspace/:id', {
    preHandler: [authMiddleware, rbacMiddleware(['admin', 'owner'])],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as { name?: string };
    const ws = inMemoryWorkspaces.find(w => w.id === id);
    if (!ws) {
      return reply.code(404).send({ error: 'Workspace not found' });
    }
    if (body.name) {
      ws.name = body.name;
    }
    ws.updatedAt = new Date().toISOString();
    return reply.code(200).send(ws);
  });

  server.delete('/workspace/:id', {
    preHandler: [authMiddleware, rbacMiddleware(['owner'])],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const idx = inMemoryWorkspaces.findIndex(w => w.id === id);
    if (idx === -1) {
      return reply.code(404).send({ error: 'Workspace not found' });
    }
    inMemoryWorkspaces.splice(idx, 1);
    return reply.code(204).send();
  });
}
