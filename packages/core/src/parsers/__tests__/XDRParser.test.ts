import { describe, it, expect, vi } from 'vitest';
import { XDRParser, createXDRParser } from '../XDRParser';

const createMockSwitch = (name: string) => ({
  name,
  value: 0,
});

const createMockScVal = (armName: string, armValue: any) => ({
  switch: () => createMockSwitch(armName),
  arm: () => armName,
  u32: () => (armName === 'scvU32' ? armValue : 0),
  i32: () => (armName === 'scvI32' ? armValue : 0),
  u64: () => ({ toString: () => String(armName === 'scvU64' ? armValue : '0') }),
  i64: () => ({ toString: () => String(armName === 'scvI64' ? armValue : '0') }),
  b: () => (armName === 'scvBool' ? armValue : false),
  sym: () => ({ toString: () => String(armName === 'scvSymbol' ? armValue : '') }),
  str: () => ({ toString: () => String(armName === 'scvString' ? armValue : '') }),
  bytes: () => Buffer.from(armName === 'scvBytes' ? armValue : '', 'hex'),
  vec: () => (armName === 'scvVec' && Array.isArray(armValue) ? armValue : []),
  map: () => (armName === 'scvMap' && Array.isArray(armValue) ? armValue : []),
  u128: () => ({ hi: () => ({ toString: () => '0' }), lo: () => ({ toString: () => '0' }) }),
  i128: () => ({ hi: () => ({ toString: () => '0' }), lo: () => ({ toString: () => '0' }) }),
  address: () => ({}),
});

vi.mock('@stellar/stellar-sdk', () => {
  return {
    xdr: {
      TransactionEnvelope: {
        fromXDR: (_data: string, _format: string) => ({
          switch: () => createMockSwitch('envelopeTypeTx'),
          v1: () => ({
            tx: () => ({
              sourceAccount: () => ({
                switch: () => createMockSwitch('keyTypeEd25519'),
                ed25519: () => Buffer.from('deadbeef', 'hex'),
              }),
              fee: () => 100,
              seqNum: () => ({ toString: () => '1234567890' }),
              memo: () => ({ value: () => 'test memo' }),
              operations: () => [
                {
                  body: () => ({
                    switch: () => createMockSwitch('invokeHostFunction'),
                    invokeHostFunctionOp: () => ({
                      hostFunction: () => ({
                        switch: () => createMockSwitch('hostFunctionTypeInvokeContract'),
                        invokeContract: () => ({
                          contractAddress: () => ({
                            contractId: () => Buffer.from('abcd1234', 'hex'),
                          }),
                          functionName: () => ({ toString: () => 'transfer' }),
                          args: () => [
                            createMockScVal('scvAddress', {}),
                            createMockScVal('scvI128', {}),
                          ],
                        }),
                      }),
                    }),
                  }),
                },
              ],
            }),
          }),
        }),
      },
      ScVal: {
        scvVoid: () => createMockScVal('scvVoid', null),
        scvU32: (v: number) => createMockScVal('scvU32', v),
        scvI32: (v: number) => createMockScVal('scvI32', v),
        scvBool: (v: boolean) => createMockScVal('scvBool', v),
        scvSymbol: (v: string) => createMockScVal('scvSymbol', v),
        scvString: (v: string) => createMockScVal('scvString', v),
        scvBytes: (v: Buffer) => createMockScVal('scvBytes', v),
        scvVec: (v: any[]) => createMockScVal('scvVec', v),
        scvMap: (v: any[]) => createMockScVal('scvMap', v),
        scvU64: (v: any) => createMockScVal('scvU64', v),
        scvI64: (v: any) => createMockScVal('scvI64', v),
        scvI128: (v: any) => createMockScVal('scvI128', v),
        scvAddress: (v: any) => createMockScVal('scvAddress', v),
        fromXDR: () => createMockScVal('scvVoid', null),
      },
      ScMapEntry: class MockScMapEntry {
        key: any;
        val: any;
        constructor(attrs: { key: any; val: any }) {
          this.key = attrs.key;
          this.val = attrs.val;
        }
      },
      Int128Parts: class MockInt128Parts {
        hi: any;
        lo: any;
        constructor(attrs: { hi: any; lo: any }) {
          this.hi = attrs.hi;
          this.lo = attrs.lo;
        }
      },
      Int64: class MockInt64 {
        value: any;
        constructor(v: any) { this.value = v; }
        toString() { return String(this.value); }
      },
      Uint64: class MockUint64 {
        value: any;
        constructor(v: any) { this.value = v; }
        toString() { return String(this.value); }
      },
    },
    Address: class MockAddress {
      constructor(_addr: string) {}
      toScVal() { return createMockScVal('scvAddress', {}); }
      toString() { return 'GDS4N3XYQN3J7Z5XZ3J7Z5XZ3J7Z5XZ3J7Z5XZ3J7Z5XZ3J7Z5XZ3J7Z5'; }
      static fromScVal() {
        return new MockAddress('GDS4N3XYQN3J7Z5XZ3J7Z5XZ3J7Z5XZ3J7Z5XZ3J7Z5XZ3J7Z5XZ3J7Z5');
      }
    },
  };
});

describe('XDRParser', () => {
  const parser = new XDRParser();

  describe('decodeTransactionEnvelope', () => {
    it('should decode a base64 transaction envelope', () => {
      const decoded = parser.decodeTransactionEnvelope('AAAAAGQQAAAAAAAAAA==');
      expect(decoded.sourceAccount).toBe('deadbeef');
      expect(decoded.fee).toBe(100);
      expect(decoded.sequence).toBe('1234567890');
      expect(decoded.operations).toHaveLength(1);
      expect(decoded.operations[0].type).toBe('invokeContract');
      expect(decoded.operations[0].contractId).toBe('abcd1234');
      expect(decoded.operations[0].functionName).toBe('transfer');
      expect(decoded.memo).toBe('test memo');
    });
  });

  describe('encodeScVal', () => {
    it('should encode address ScVal', () => {
      const result = parser.encodeScVal({
        type: 'address',
        value: 'GDS4N3XYQN3J7Z5XZ3J7Z5XZ3J7Z5XZ3J7Z5XZ3J7Z5XZ3J7Z5XZ3J7Z5',
      });
      expect(result.switch().name).toBe('scvAddress');
    });

    it('should encode void ScVal', () => {
      const result = parser.encodeScVal({ type: 'void', value: null });
      expect(result.switch().name).toBe('scvVoid');
    });

    it('should encode symbol ScVal', () => {
      const result = parser.encodeScVal({ type: 'symbol', value: 'transfer' });
      expect(result.switch().name).toBe('scvSymbol');
    });

    it('should encode u32 ScVal', () => {
      const result = parser.encodeScVal({ type: 'u32', value: 42 });
      expect(result.switch().name).toBe('scvU32');
    });

    it('should encode bool ScVal', () => {
      const result = parser.encodeScVal({ type: 'bool', value: true });
      expect(result.switch().name).toBe('scvBool');
    });

    it('should encode bytes ScVal', () => {
      const result = parser.encodeScVal({ type: 'bytes', value: 'deadbeef' });
      expect(result.switch().name).toBe('scvBytes');
    });

    it('should encode a nested vec ScVal', () => {
      const result = parser.encodeScVal({
        type: 'vec',
        value: [
          { type: 'symbol', value: 'a' },
          { type: 'u32', value: 1 },
        ],
      });
      expect(result.switch().name).toBe('scvVec');
    });

    it('should encode u64 ScVal', () => {
      const result = parser.encodeScVal({ type: 'u64', value: '12345' });
      expect(result.switch().name).toBe('scvU64');
    });

    it('should encode i64 ScVal', () => {
      const result = parser.encodeScVal({ type: 'i64', value: '12345' });
      expect(result.switch().name).toBe('scvI64');
    });

    it('should encode i128 ScVal', () => {
      const result = parser.encodeScVal({ type: 'i128', value: '12345' });
      expect(result.switch().name).toBe('scvI128');
    });
  });

  describe('decodeScVal', () => {
    it('should decode void', () => {
      const val = parser.encodeScVal({ type: 'void', value: null });
      const decoded = parser.decodeScVal(val);
      expect(decoded.type).toBe('void');
    });

    it('should decode symbol', () => {
      const val = parser.encodeScVal({ type: 'symbol', value: 'hello' });
      const decoded = parser.decodeScVal(val);
      expect(decoded.type).toBe('symbol');
      expect(decoded.value).toBe('hello');
    });

    it('should decode u32', () => {
      const val = parser.encodeScVal({ type: 'u32', value: 42 });
      const decoded = parser.decodeScVal(val);
      expect(decoded.type).toBe('u32');
    });

    it('should decode bool', () => {
      const val = parser.encodeScVal({ type: 'bool', value: true });
      const decoded = parser.decodeScVal(val);
      expect(decoded.type).toBe('bool');
    });

    it('should round-trip void', () => {
      const input: any = { type: 'void', value: null };
      const encoded = parser.encodeScVal(input);
      const decoded = parser.decodeScVal(encoded);
      expect(decoded.type).toBe('void');
    });

    it('should round-trip symbol', () => {
      const input: any = { type: 'symbol', value: 'test' };
      const encoded = parser.encodeScVal(input);
      const decoded = parser.decodeScVal(encoded);
      expect(decoded.type).toBe('symbol');
    });
  });

  describe('parseDiagnosticEvents', () => {
    it('should parse an array of diagnostic events', () => {
      const mockDiagEvent = {
        inSuccessfulContractCall: () => true,
        event: () => ({
          contractId: () => Buffer.from('abcd1234ef567890', 'hex'),
          body: () => ({
            switch: () => 0,
            v0: () => ({
              topics: () => [parser.encodeScVal({ type: 'symbol', value: 'transfer' })],
              data: () => parser.encodeScVal({ type: 'void', value: null }),
            }),
          }),
        }),
      };

      const results = parser.parseDiagnosticEvents([mockDiagEvent as any]);
      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(true);
      expect(results[0].contractId).toBe('abcd1234ef567890');
      expect(results[0].functionName).toBe('transfer');
    });

    it('should handle empty events array', () => {
      const results = parser.parseDiagnosticEvents([]);
      expect(results).toHaveLength(0);
    });
  });

  describe('extractTransactionData', () => {
    it('should extract resources from SorobanTransactionData', () => {
      const mockTxData = {
        resources: () => ({
          footprint: () => ({ readOnly: () => [], readWrite: () => [] }),
          instructions: () => 100000,
          readBytes: () => 80,
          writeBytes: () => 40,
        }),
        resourceFee: () => ({ toString: () => '5000' }),
      };

      const info = parser.extractTransactionData(mockTxData as any);
      expect(info.resources.readBytes).toBe(80);
      expect(info.resources.writeBytes).toBe(40);
      expect(info.resources.instructionLeeway).toBe(100000);
      expect(info.resourceFee).toBe(5000);
    });
  });

  describe('createXDRParser', () => {
    it('should create an XDRParser instance', () => {
      const instance = createXDRParser();
      expect(instance).toBeInstanceOf(XDRParser);
    });
  });
});
