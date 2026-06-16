import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildServer } from '../server';
import type { FastifyInstance } from 'fastify';

describe('API Server', () => {
  let server: FastifyInstance;

  beforeAll(async () => {
    process.env['NODE_ENV'] = 'test';
    const built = await buildServer({ port: 0, host: '127.0.0.1' });
    server = built.server;
    await server.ready();
  });

  afterAll(async () => {
    await server.close();
  });

  it('GET /health returns ok', async () => {
    const response = await server.inject({
      method: 'GET',
      url: '/health',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.status).toBe('ok');
    expect(body.service).toBe('soropreflight-api');
    expect(body.version).toBe('0.1.0');
    expect(body).toHaveProperty('timestamp');
  });

  it('POST /api/v1/simulate returns 401 without auth', async () => {
    const response = await server.inject({
      method: 'POST',
      url: '/api/v1/simulate',
      payload: {
        contractId: 'CA3D5KRYM6CB7OWQ6TWYRR3Z4T7GNZLKERYNZGGA5SOAOPIFY6YQGAXE',
        method: 'increment',
        args: [],
        sourceAccount: 'GDS4N3XYQN3J7Z5XZ3J7Z5XZ3J7Z5XZ3J7Z5XZ3J7Z5XZ3J7Z5XZ3J7Z5',
      },
    });

    expect(response.statusCode).toBe(401);
  });

  it('POST /api/v1/simulate/batch returns 401 without auth', async () => {
    const response = await server.inject({
      method: 'POST',
      url: '/api/v1/simulate/batch',
      payload: {
        operations: [],
      },
    });

    expect(response.statusCode).toBe(401);
  });

  it('POST /api/v1/deploy/simulate returns 401 without auth', async () => {
    const response = await server.inject({
      method: 'POST',
      url: '/api/v1/deploy/simulate',
      payload: {
        wasm: 'AGFzbQEAAAAB',
        sourceAccount: 'GDS4N3XYQN3J7Z5XZ3J7Z5XZ3J7Z5XZ3J7Z5XZ3J7Z5XZ3J7Z5XZ3J7Z5',
      },
    });

    expect(response.statusCode).toBe(401);
  });

  it('GET /api/v1/logs returns 401 without auth', async () => {
    const response = await server.inject({
      method: 'GET',
      url: '/api/v1/logs',
    });

    expect(response.statusCode).toBe(401);
  });

  it('GET /api/v1/workspace returns 401 without auth', async () => {
    const response = await server.inject({
      method: 'GET',
      url: '/api/v1/workspace',
    });

    expect(response.statusCode).toBe(401);
  });

  it('POST /api/v1/simulate with valid auth but insufficient roles returns 403', async () => {
    const jwt = await import('jsonwebtoken');
    const token = jwt.default.sign(
      { userId: 'test-user', email: 'viewer@test.com', name: 'Viewer', roles: ['viewer'] },
      'soropreflight-dev-secret',
    );

    const response = await server.inject({
      method: 'POST',
      url: '/api/v1/simulate',
      headers: { authorization: `Bearer ${token}` },
      payload: {
        contractId: 'CA3D5KRYM6CB7OWQ6TWYRR3Z4T7GNZLKERYNZGGA5SOAOPIFY6YQGAXE',
        method: 'increment',
        args: [],
        sourceAccount: 'GDS4N3XYQN3J7Z5XZ3J7Z5XZ3J7Z5XZ3J7Z5XZ3J7Z5XZ3J7Z5XZ3J7Z5',
      },
    });

    expect(response.statusCode).toBe(403);
  });

  it('POST /api/v1/simulate with valid auth and role (returns error result, not HTTP error)', async () => {
    const jwt = await import('jsonwebtoken');
    const token = jwt.default.sign(
      { userId: 'test-user', email: 'dev@test.com', name: 'Dev', roles: ['developer'] },
      'soropreflight-dev-secret',
    );

    const response = await server.inject({
      method: 'POST',
      url: '/api/v1/simulate',
      headers: { authorization: `Bearer ${token}` },
      payload: {
        contractId: 'CA3D5KRYM6CB7OWQ6TWYRR3Z4T7GNZLKERYNZGGA5SOAOPIFY6YQGAXE',
        method: 'increment',
        args: [],
        sourceAccount: 'GDS4N3XYQN3J7Z5XZ3J7Z5XZ3J7Z5XZ3J7Z5XZ3J7Z5XZ3J7Z5XZ3J7Z5',
      },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body).toHaveProperty('id');
    expect(body).toHaveProperty('status');
  });

  it('GET /api/v1/workspace returns 200 with valid auth', async () => {
    const jwt = await import('jsonwebtoken');
    const token = jwt.default.sign(
      { userId: 'test-user', email: 'viewer@test.com', name: 'Viewer', roles: ['viewer'] },
      'soropreflight-dev-secret',
    );

    const response = await server.inject({
      method: 'GET',
      url: '/api/v1/workspace',
      headers: { authorization: `Bearer ${token}` },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body).toHaveProperty('workspaces');
  });

  it('GET /api/v1/logs returns 403 for viewer role', async () => {
    const jwt = await import('jsonwebtoken');
    const token = jwt.default.sign(
      { userId: 'test-user', email: 'viewer@test.com', name: 'Viewer', roles: ['viewer'] },
      'soropreflight-dev-secret',
    );

    const response = await server.inject({
      method: 'GET',
      url: '/api/v1/logs',
      headers: { authorization: `Bearer ${token}` },
    });

    expect(response.statusCode).toBe(403);
  });

  it('GET /api/v1/logs returns 200 for admin role', async () => {
    const jwt = await import('jsonwebtoken');
    const token = jwt.default.sign(
      { userId: 'admin-user', email: 'admin@test.com', name: 'Admin', roles: ['admin'] },
      'soropreflight-dev-secret',
    );

    const response = await server.inject({
      method: 'GET',
      url: '/api/v1/logs',
      headers: { authorization: `Bearer ${token}` },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body).toHaveProperty('entries');
    expect(body).toHaveProperty('page');
    expect(body).toHaveProperty('limit');
  });

  it('POST /api/v1/workspace returns 403 for viewer role', async () => {
    const jwt = await import('jsonwebtoken');
    const token = jwt.default.sign(
      { userId: 'test-user', email: 'viewer@test.com', name: 'Viewer', roles: ['viewer'] },
      'soropreflight-dev-secret',
    );

    const response = await server.inject({
      method: 'POST',
      url: '/api/v1/workspace',
      headers: { authorization: `Bearer ${token}` },
      payload: { name: 'Test Workspace' },
    });

    expect(response.statusCode).toBe(403);
  });

  it('workspace CRUD flow with admin role', async () => {
    const jwt = await import('jsonwebtoken');
    const token = jwt.default.sign(
      { userId: 'admin-user', email: 'admin@test.com', name: 'Admin', roles: ['admin'] },
      'soropreflight-dev-secret',
    );

    const createResponse = await server.inject({
      method: 'POST',
      url: '/api/v1/workspace',
      headers: { authorization: `Bearer ${token}` },
      payload: { name: 'My Workspace' },
    });
    expect(createResponse.statusCode).toBe(201);
    const ws = JSON.parse(createResponse.body);
    expect(ws.name).toBe('My Workspace');
    expect(ws.id).toBeDefined();

    const getResponse = await server.inject({
      method: 'GET',
      url: `/api/v1/workspace/${ws.id}`,
      headers: { authorization: `Bearer ${token}` },
    });
    expect(getResponse.statusCode).toBe(200);
    expect(JSON.parse(getResponse.body).id).toBe(ws.id);

    const listResponse = await server.inject({
      method: 'GET',
      url: '/api/v1/workspace',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(listResponse.statusCode).toBe(200);
    expect(JSON.parse(listResponse.body).workspaces.length).toBeGreaterThanOrEqual(1);
  });
});
