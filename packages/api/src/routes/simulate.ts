import { FastifyInstance } from 'fastify';
import { SimulationRequest, SimulationResult } from '@soropreflight/core';
import { SoroPreFlight } from '@soropreflight/sdk';
import { authMiddleware } from '../middleware/auth';
import { rbacMiddleware } from '../middleware/rbac';

export async function simulateRoutes(server: FastifyInstance) {
  server.post('/simulate', {
    preHandler: [authMiddleware, rbacMiddleware(['developer', 'admin', 'owner'])],
  }, async (request, reply) => {
    try {
      const sdk = new SoroPreFlight();
      const body = request.body as SimulationRequest;
      const result = await sdk.simulate({
        contractId: body.contractId,
        method: body.method,
        args: body.args,
        sourceAccount: body.sourceAccount,
        network: body.network,
        rpcUrl: body.rpcUrl,
        forkLedger: body.forkLedger,
        analyze: body.analyze,
        analysisLevel: body.analysisLevel,
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

  server.post('/simulate/batch', {
    preHandler: [authMiddleware, rbacMiddleware(['developer', 'admin', 'owner'])],
  }, async (request, reply) => {
    try {
      const sdk = new SoroPreFlight();
      const body = request.body as { operations: SimulationRequest[]; concurrency?: number };
      const result = await sdk.simulateBatch({
        operations: body.operations.map(op => ({
          contractId: op.contractId,
          method: op.method,
          args: op.args,
          sourceAccount: op.sourceAccount,
          network: op.network,
          rpcUrl: op.rpcUrl,
          forkLedger: op.forkLedger,
          analyze: op.analyze,
          analysisLevel: op.analysisLevel,
        })),
        concurrency: body.concurrency,
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
