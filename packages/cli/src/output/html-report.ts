import * as fs from 'fs';
import * as path from 'path';
import type {
  SimulationResult,
  DeployResult,
  CheckResult,
  FeeEstimate,
  AuthResult,
} from '@soropreflight/sdk';
import type { BatchResult, SuiteResult } from '@soropreflight/sdk';

export function writeHtmlReport(
  data: SimulationResult | DeployResult | BatchResult | SuiteResult,
  outputDir: string,
): string {
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const reportId = 'id' in data ? data.id : `suite-${Date.now()}`;
  const filename = `report-${reportId}.html`;
  const filePath = path.join(outputDir, filename);

  const html = generateHtml(data, reportId);
  fs.writeFileSync(filePath, html, 'utf-8');

  return filePath;
}

function generateHtml(data: SimulationResult | DeployResult | BatchResult | SuiteResult, id: string): string {
  if ('fee' in data && 'contractId' in data) {
    return generateSimulationHtml(data as SimulationResult, id);
  }
  if ('wasmHash' in data) {
    return generateDeployHtml(data as DeployResult, id);
  }
  if ('results' in data && 'collisions' in data) {
    return generateBatchHtml(data as BatchResult, id);
  }
  return generateGenericHtml(data as any, id);
}

function statusColor(status: string): string {
  switch (status) {
    case 'PASS':
    case 'SUCCESS':
    case 'ALL_PASS': return '#22c55e';
    case 'FAIL':
    case 'ERROR':
    case 'ALL_FAIL': return '#ef4444';
    case 'WARN':
    case 'PARTIAL_FAIL': return '#f59e0b';
    default: return '#6b7280';
  }
}

function headerHtml(title: string, status: string): string {
  return `
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:24px">
      <div style="width:16px;height:16px;border-radius:50%;background:${statusColor(status)}"></div>
      <h1 style="margin:0;font-size:24px">${title}</h1>
      <span style="padding:4px 12px;border-radius:12px;background:${statusColor(status)}20;color:${statusColor(status)};font-weight:600;font-size:14px">${status}</span>
    </div>`;
}

function checksHtml(checks: CheckResult[]): string {
  if (!checks || checks.length === 0) return '';
  const rows = checks.map(c => `
    <tr>
      <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font-family:monospace;font-size:13px">${c.check}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb">
        <span style="display:inline-block;padding:2px 8px;border-radius:8px;font-size:12px;font-weight:600;background:${statusColor(c.status)}20;color:${statusColor(c.status)}">${c.status}</span>
      </td>
      <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font-size:13px">${c.message}</td>
    </tr>`).join('');

  return `
    <h2 style="font-size:18px;margin:24px 0 12px">Pre-flight Checks</h2>
    <table style="width:100%;border-collapse:collapse;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1)">
      <thead>
        <tr style="background:#f9fafb;border-bottom:2px solid #e5e7eb">
          <th style="padding:10px 12px;text-align:left;font-size:13px;font-weight:600;color:#374151">Check</th>
          <th style="padding:10px 12px;text-align:left;font-size:13px;font-weight:600;color:#374151">Status</th>
          <th style="padding:10px 12px;text-align:left;font-size:13px;font-weight:600;color:#374151">Message</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>`;
}

function feeHtml(fee: FeeEstimate): string {
  const rows = [
    ['Min Fee', `${fee.minFee} stroops`],
    ['Max Fee', `${fee.maxFee} stroops`],
    ['Recommended Fee', `${fee.recommendedFee} stroops`],
    ['Fee Surplus', `${fee.feeSurplusPercent.toFixed(1)}%`],
    ['Instructions', `${fee.instructions.toLocaleString()} / ${fee.maxInstructions.toLocaleString()}`],
    ['Read Bytes', fee.readBytes.toLocaleString()],
    ['Write Bytes', fee.writeBytes.toLocaleString()],
  ].map(([label, value]) => `
    <tr>
      <td style="padding:6px 12px;border-bottom:1px solid #f3f4f6;font-size:13px;color:#6b7280">${label}</td>
      <td style="padding:6px 12px;border-bottom:1px solid #f3f4f6;font-size:13px;font-family:monospace">${value}</td>
    </tr>`).join('');

  return `
    <h2 style="font-size:18px;margin:24px 0 12px">Fee Estimate</h2>
    <table style="width:100%;border-collapse:collapse;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1)">
      <tbody>${rows}</tbody>
    </table>`;
}

function authHtml(auth: AuthResult[]): string {
  if (!auth || auth.length === 0) return '';
  const rows = auth.map(a => `
    <tr>
      <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font-family:monospace;font-size:13px">${a.signer}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb">
        <span style="display:inline-block;padding:2px 8px;border-radius:8px;font-size:12px;font-weight:600;background:${statusColor(a.authorized ? 'PASS' : 'FAIL')}20;color:${statusColor(a.authorized ? 'PASS' : 'FAIL')}">${a.authorized ? 'Yes' : 'No'}</span>
      </td>
      <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font-size:13px">${a.weight ?? '-'}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font-size:13px">${a.threshold ?? '-'}</td>
    </tr>`).join('');

  return `
    <h2 style="font-size:18px;margin:24px 0 12px">Authorization</h2>
    <table style="width:100%;border-collapse:collapse;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1)">
      <thead>
        <tr style="background:#f9fafb;border-bottom:2px solid #e5e7eb">
          <th style="padding:10px 12px;text-align:left;font-size:13px;font-weight:600;color:#374151">Signer</th>
          <th style="padding:10px 12px;text-align:left;font-size:13px;font-weight:600;color:#374151">Authorized</th>
          <th style="padding:10px 12px;text-align:left;font-size:13px;font-weight:600;color:#374151">Weight</th>
          <th style="padding:10px 12px;text-align:left;font-size:13px;font-weight:600;color:#374151">Threshold</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>`;
}

function generateSimulationHtml(result: SimulationResult, id: string): string {
  const body = `
    ${headerHtml(`Simulation: ${result.contractId}.${result.method}`, result.status)}
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px">
      ${[['Contract ID', result.contractId], ['Function', result.method], ['Network', result.network], ['Ledger', String(result.ledger)]].map(([l, v]) => `
        <div style="background:#fff;padding:12px 16px;border-radius:8px;box-shadow:0 1px 3px rgba(0,0,0,0.1)">
          <div style="font-size:12px;color:#6b7280;margin-bottom:4px">${l}</div>
          <div style="font-size:14px;font-family:monospace;font-weight:600">${v}</div>
        </div>`).join('')}
    </div>
    ${feeHtml(result.fee)}
    ${authHtml(result.auth)}
    ${checksHtml(result.checkResults)}
    ${result.ai ? `
      <h2 style="font-size:18px;margin:24px 0 12px">AI Analysis (${result.ai.level})</h2>
      <div style="background:#fff;padding:16px;border-radius:8px;box-shadow:0 1px 3px rgba(0,0,0,0.1)">
        <p style="margin:0 0 12px;font-size:14px;line-height:1.6">${result.ai.summary}</p>
        ${result.ai.suggestions?.length ? `<ul style="margin:0;font-size:13px;color:#374151">${result.ai.suggestions.map(s => `<li style="margin-bottom:4px">${s}</li>`).join('')}</ul>` : ''}
      </div>` : ''}
    ${result.error ? `
      <h2 style="font-size:18px;margin:24px 0 12px;color:#ef4444">Error</h2>
      <div style="background:#fef2f2;padding:16px;border-radius:8px;border:1px solid #fecaca">
        <p style="margin:0;font-family:monospace;font-size:13px"><strong>[${result.error.code}]</strong> ${result.error.message}</p>
        ${result.error.diagnostic ? `<pre style="margin:8px 0 0;font-size:12px;color:#6b7280">${result.error.diagnostic}</pre>` : ''}
      </div>` : ''}
    <div style="margin-top:24px;font-size:12px;color:#9ca3af">
      <span>Report ID: ${id}</span> &middot; <span>${result.timestamp}</span>
    </div>`;

  return wrapHtml('Simulation Report', body);
}

function generateDeployHtml(result: DeployResult, id: string): string {
  const body = `
    ${headerHtml('Deploy Simulation', result.status)}
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px">
      ${[['WASM Hash', result.wasmHash], ['Contract ID', result.contractId || '-']].map(([l, v]) => `
        <div style="background:#fff;padding:12px 16px;border-radius:8px;box-shadow:0 1px 3px rgba(0,0,0,0.1)">
          <div style="font-size:12px;color:#6b7280;margin-bottom:4px">${l}</div>
          <div style="font-size:14px;font-family:monospace;font-weight:600">${v}</div>
        </div>`).join('')}
    </div>
    ${checksHtml(result.checkResults)}
    ${result.error ? `
      <div style="background:#fef2f2;padding:16px;border-radius:8px;border:1px solid #fecaca;margin-top:16px">
        <p style="margin:0;font-family:monospace;font-size:13px"><strong>[${result.error.code}]</strong> ${result.error.message}</p>
      </div>` : ''}`;

  return wrapHtml('Deploy Report', body);
}

function generateBatchHtml(result: BatchResult, id: string): string {
  const total = result.results.length;
  const passed = result.results.filter(r => r.status === 'SUCCESS').length;
  const failed = total - passed;

  const resultsList = result.results.map(r => `
    <div style="display:flex;align-items:center;gap:8px;padding:8px 12px;background:#fff;border-radius:6px;margin-bottom:4px;box-shadow:0 1px 2px rgba(0,0,0,0.05)">
      <div style="width:10px;height:10px;border-radius:50%;background:${statusColor(r.status)}"></div>
      <span style="font-family:monospace;font-size:13px">${r.contractId}.${r.method}</span>
      <span style="margin-left:auto;font-size:12px;color:#6b7280">${r.status}</span>
    </div>`).join('');

  const body = `
    ${headerHtml('Batch Simulation', result.status)}
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:16px">
      ${[['Total', String(total)], ['Passed', `<span style="color:#22c55e">${passed}</span>`], ['Failed', `<span style="color:${failed > 0 ? '#ef4444' : '#6b7280'}">${failed}</span>`]].map(([l, v]) => `
        <div style="background:#fff;padding:12px 16px;border-radius:8px;box-shadow:0 1px 3px rgba(0,0,0,0.1);text-align:center">
          <div style="font-size:24px;font-weight:700">${v}</div>
          <div style="font-size:12px;color:#6b7280;margin-top:4px">${l}</div>
        </div>`).join('')}
    </div>
    ${result.collisions.length > 0 ? `
      <h2 style="font-size:18px;margin:24px 0 12px;color:#f59e0b">State Collisions (${result.collisions.length})</h2>
      ${result.collisions.map(c => `<div style="background:#fffbeb;padding:10px 16px;border-radius:6px;border:1px solid #fde68a;margin-bottom:4px;font-size:13px">${c}</div>`).join('')}` : ''}
    <h2 style="font-size:18px;margin:24px 0 12px">Results</h2>
    ${resultsList}`;

  return wrapHtml('Batch Report', body);
}

function generateGenericHtml(data: SuiteResult | any, id: string): string {
  const steps = data.results || data.steps || [];
  const stepsList = steps.map((s: any) => `
    <div style="display:flex;align-items:center;gap:8px;padding:8px 12px;background:#fff;border-radius:6px;margin-bottom:4px;box-shadow:0 1px 2px rgba(0,0,0,0.05)">
      <div style="width:10px;height:10px;border-radius:50%;background:${statusColor(s.status)}"></div>
      <span style="font-family:monospace;font-size:13px">${s.name}</span>
      <span style="font-size:12px;color:#6b7280;margin-left:8px">[${s.type}]</span>
      <span style="margin-left:auto;font-size:12px;color:#6b7280">${s.status}</span>
    </div>`).join('');

  const body = `
    ${headerHtml(data.name || 'Report', data.status || 'UNKNOWN')}
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:16px">
      ${[['Network', data.network || '-'], ['Duration', data.duration ? `${data.duration}ms` : '-'], ['Steps', String(steps.length)]].map(([l, v]) => `
        <div style="background:#fff;padding:12px 16px;border-radius:8px;box-shadow:0 1px 3px rgba(0,0,0,0.1);text-align:center">
          <div style="font-size:14px;font-weight:600">${v}</div>
          <div style="font-size:12px;color:#6b7280;margin-top:4px">${l}</div>
        </div>`).join('')}
    </div>
    <h2 style="font-size:18px;margin:24px 0 12px">Steps</h2>
    ${stepsList}`;

  return wrapHtml(data.name || 'Report', body);
}

function wrapHtml(title: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SoroPreFlight - ${title}</title>
</head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f3f4f6;margin:0;padding:24px;color:#111827">
  <div style="max-width:960px;margin:0 auto">
    ${body}
  </div>
</body>
</html>`;
}
