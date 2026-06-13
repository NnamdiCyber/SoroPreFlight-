import { describe, it, expect } from 'vitest';
import { DiagnosticsParser, createDiagnosticsParser } from '../DiagnosticsParser';
import type { DiagnosticEventInfo } from '../XDRParser';

describe('DiagnosticsParser', () => {
  const parser = new DiagnosticsParser();

  const mockEvent = (
    contractId: string,
    functionName: string,
    success: boolean,
  ): DiagnosticEventInfo => ({
    contractId,
    functionName,
    topics: [{ type: 'symbol', value: functionName }],
    data: { type: 'void', value: null },
    success,
  });

  describe('parseError', () => {
    it('should return null for empty error string', () => {
      expect(parser.parseError('')).toBeNull();
      expect(parser.parseError(null as unknown as string)).toBeNull();
    });

    it('should parse token ContractError(1)', () => {
      const error = parser.parseError('HostError: ContractError(1) - token error');
      expect(error).not.toBeNull();
      expect(error!.code).toBe(1);
      expect(error!.message).toContain('Insufficient balance');
      expect(error!.remediation).toHaveLength(2);
    });

    it('should parse token ContractError(3)', () => {
      const error = parser.parseError('ContractError(3) - allowance');
      expect(error).not.toBeNull();
      expect(error!.code).toBe(3);
      expect(error!.message).toContain('allowance');
    });

    it('should parse spot-dex ContractError(4)', () => {
      const error = parser.parseError('spot-dex pool error: ContractError(4)');
      expect(error).not.toBeNull();
      expect(error!.code).toBe(4);
      expect(error!.message).toContain('paused');
    });

    it('should handle unknown error codes', () => {
      const error = parser.parseError('ContractError(99)');
      expect(error).not.toBeNull();
      expect(error!.code).toBe(99);
      expect(error!.message).toContain('unknown');
    });

    it('should match generic error patterns', () => {
      const error = parser.parseError('HostError occurred during execution');
      expect(error).not.toBeNull();
      expect(error!.message).toContain('Host-level error');
    });

    it('should handle non-contract error strings', () => {
      const error = parser.parseError('Some random error occurred');
      expect(error).not.toBeNull();
      expect(error!.code).toBe(0);
      expect(error!.message).toBe('Some random error occurred');
    });
  });

  describe('parse', () => {
    it('should parse diagnostics with error and events', () => {
      const events = [mockEvent('CA3D5KRYM6CB7OWQ6TWYRR3Z4T7', 'transfer', true)];
      const result = parser.parse('ContractError(1)', events);

      expect(result.error).not.toBeNull();
      expect(result.error!.code).toBe(1);
      expect(result.callTraces).toHaveLength(1);
      expect(result.callTraces[0].functionName).toBe('transfer');
      expect(result.callTraces[0].success).toBe(true);
      expect(result.raw).toBe('ContractError(1)');
    });

    it('should handle diagnostics with no error', () => {
      const events: DiagnosticEventInfo[] = [];
      const result = parser.parse('', events);
      expect(result.error).toBeNull();
      expect(result.callTraces).toHaveLength(0);
    });

    it('should build call traces from events', () => {
      const events = [
        mockEvent('contract1', 'approve', true),
        mockEvent('contract2', 'transfer', false),
      ];
      const result = parser.parse('ContractError(1)', events);

      expect(result.callTraces).toHaveLength(2);
      expect(result.callTraces[0].contractId).toBe('contract1');
      expect(result.callTraces[0].functionName).toBe('approve');
      expect(result.callTraces[1].contractId).toBe('contract2');
      expect(result.callTraces[1].functionName).toBe('transfer');
      expect(result.callTraces[1].success).toBe(false);
    });
  });

  describe('lookupErrorCode', () => {
    it('should find error code by contract type', () => {
      const entry = parser.lookupErrorCode(1, 'token');
      expect(entry).not.toBeNull();
      expect(entry!.message).toContain('Insufficient balance');
    });

    it('should fall back to global lookup when contract type is unknown', () => {
      const entry = parser.lookupErrorCode(1);
      expect(entry).not.toBeNull();
      expect(entry!.message).toContain('Insufficient balance');
    });

    it('should return null for completely unknown code', () => {
      const entry = parser.lookupErrorCode(99999);
      expect(entry).toBeNull();
    });
  });

  describe('getErrorMessage', () => {
    it('should return message for known code', () => {
      const msg = parser.getErrorMessage(4, 'token');
      expect(msg).toContain('Unauthorized');
    });

    it('should return fallback for unknown code', () => {
      const msg = parser.getErrorMessage(999);
      expect(msg).toContain('Unknown error code');
    });
  });

  describe('addErrorCode', () => {
    it('should add custom error code entries', () => {
      parser.addErrorCode('custom-contract', {
        code: 42,
        contractType: 'custom-contract',
        message: 'Custom error message',
        remediation: ['Fix the custom error'],
      });

      const entry = parser.lookupErrorCode(42, 'custom-contract');
      expect(entry).not.toBeNull();
      expect(entry!.message).toBe('Custom error message');
    });
  });

  describe('createDiagnosticsParser', () => {
    it('should create a DiagnosticsParser instance', () => {
      const instance = createDiagnosticsParser();
      expect(instance).toBeInstanceOf(DiagnosticsParser);
    });
  });
});
