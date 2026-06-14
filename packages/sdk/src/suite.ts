import * as fs from 'fs';
import * as path from 'path';
import yaml from 'js-yaml';
import {
  Network,
  SuiteDefinition,
  SuiteSimulation,
  SimulationResult,
  DeployResult,
} from '@soropreflight/core';
import { SoroPreFlight } from './SoroPreFlight';
import { SuiteResult, SuiteStepResult } from './types';

export async function runSuite(suitePath: string, sdk: SoroPreFlight): Promise<SuiteResult> {
  const absolutePath = path.resolve(suitePath);
  const fileContent = fs.readFileSync(absolutePath, 'utf-8');
  const suiteDef = yaml.load(fileContent) as SuiteDefinition;

  const startTime = Date.now();
  const stepResults: SuiteStepResult[] = [];

  if (suiteDef.setup?.deploy) {
    const deployResult = await sdk.deploy({
      wasm: suiteDef.setup.deploy.wasm,
      sourceAccount: suiteDef.setup.deploy.source,
    });

    stepResults.push({
      name: `deploy:${suiteDef.setup.deploy.alias}`,
      type: 'deploy',
      status: deployResult.status === 'SUCCESS' ? 'SUCCESS' : 'FAIL',
      result: deployResult,
    });
  }

  for (const sim of suiteDef.simulations) {
    const expected = sim.expect || { status: 'SUCCESS' };

    try {
      const result = await sdk.simulate({
        contractId: sim.contract,
        method: sim.function,
        args: sim.args,
        sourceAccount: '',
        network: suiteDef.network,
      });

      const stepResult: SuiteStepResult = {
        name: sim.name,
        type: 'simulate',
        status: expected.status === result.status ? 'SUCCESS' : 'FAIL',
        result,
        expected: expected as unknown as Record<string, unknown>,
      };

      if (expected.max_fee_xlm !== undefined && result.fee.recommendedFee > expected.max_fee_xlm * 1e7) {
        stepResult.status = 'FAIL';
      }

      if (expected.error_contains && result.error) {
        if (!result.error.message.toLowerCase().includes(expected.error_contains.toLowerCase())) {
          stepResult.status = 'FAIL';
        }
      }

      stepResults.push(stepResult);
    } catch (err) {
      stepResults.push({
        name: sim.name,
        type: 'simulate',
        status: 'ERROR',
        error: err instanceof Error ? err.message : String(err),
        expected: expected as unknown as Record<string, unknown>,
      });
    }
  }

  const duration = Date.now() - startTime;
  const failedCount = stepResults.filter(r => r.status === 'FAIL' || r.status === 'ERROR').length;
  let status: SuiteResult['status'];
  if (failedCount === 0) {
    status = 'ALL_PASS';
  } else if (failedCount === stepResults.length) {
    status = 'ALL_FAIL';
  } else {
    status = 'PARTIAL_FAIL';
  }

  return {
    name: suiteDef.name,
    network: suiteDef.network,
    results: stepResults,
    status,
    duration,
  };
}
