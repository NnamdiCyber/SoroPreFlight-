import { FastifyInstance } from 'fastify';
import { DeployRequest, DeployResult } from '@soropreflight/core';
import { SoroPreFlight } from '@soropreflight/sdk';
import { authMiddleware } from '../middleware/auth';
import { rbacMiddleware } from '../middleware/rbac';

export async function deployRoutes(server: FastifyInstance) {
  server.post('/deploy/simulate', {
    preHandler: [authMiddleware, rbacMiddleware(['admin', 'owner'])],
  }, async (request, reply) => {
    try {
      const sdk = new SoroPreFlight();
      const body = request.body as DeployRequest;
      const result = await sdk.deploy({
        wasm: body.wasm,
        sourceAccount: body.sourceAccount,
        wasmHash: body.wasmHash,
        analyze: body.analyze,
        analysisLevel: body.analysisLevel,
        network: body.network,
        rpcUrl: body.rpcUrl,
      });
      return reply.code(200).send(result);
    } catch (err) {
      request.log.error(err);
      return reply.code(500).send({
        status: 'ERROR',
        error: {
          code: 'INTERNAL_ERROR',
          message: err instanceof Error ? err.message : 'Internal server error',
        },
      });
    }
  });
}
