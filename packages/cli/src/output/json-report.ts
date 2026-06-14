import * as fs from 'fs';
import * as path from 'path';
import type {
  SimulationResult,
  DeployResult,
} from '@soropreflight/sdk';
import type { BatchResult, SuiteResult } from '@soropreflight/sdk';
import { buildSimulationReport } from './reporter';

export function writeJsonReport(
  data: SimulationResult | DeployResult | BatchResult | SuiteResult,
  outputDir: string,
): string {
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const reportId = 'id' in data ? data.id : `suite-${Date.now()}`;
  const filename = `report-${reportId}.json`;
  const filePath = path.join(outputDir, filename);

  const reportData = prepareReportData(data);
  fs.writeFileSync(filePath, JSON.stringify(reportData, null, 2), 'utf-8');

  return filePath;
}

function prepareReportData(data: SimulationResult | DeployResult | BatchResult | SuiteResult): object {
  if ('fee' in data && 'contractId' in data) {
    return buildSimulationReport(data as SimulationResult);
  }

  if ('wasmHash' in data) {
    const d = data as DeployResult;
    return {
      id: `deploy-${Date.now()}`,
      status: d.status,
      wasmHash: d.wasmHash,
      contractId: d.contractId,
      checks: d.checks,
      checkResults: d.checkResults,
      ai: d.ai ? { level: d.ai.level, summary: d.ai.summary } : undefined,
      error: d.error,
      timestamp: new Date().toISOString(),
    };
  }

  if ('results' in data && 'collisions' in data) {
    const b = data as BatchResult;
    return {
      id: `batch-${Date.now()}`,
      status: b.status,
      count: b.results.length,
      collisions: b.collisions,
      results: b.results.map(r => buildSimulationReport(r)),
      timestamp: new Date().toISOString(),
    };
  }

  if ('name' in data && 'steps' in data) {
    const s = data as any;
    return {
      name: s.name,
      network: s.network,
      status: s.status,
      duration: s.duration,
      steps: s.results.map((r: any) => ({
        name: r.name,
        type: r.type,
        status: r.status,
        error: r.error,
      })),
    };
  }

  return data as unknown as Record<string, unknown>;
}
