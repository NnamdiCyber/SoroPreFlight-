import { xdr, Address } from '@stellar/stellar-sdk';
import type { ScVal } from '../types';

export interface DecodedTransactionEnvelope {
  sourceAccount: string;
  fee: number;
  sequence: string;
  operations: DecodedOperation[];
  memo?: string;
}

export interface DecodedOperation {
  type: string;
  contractId?: string;
  functionName?: string;
  args?: ScVal[];
}

export interface DiagnosticEventInfo {
  contractId: string;
  functionName?: string;
  topics: ScVal[];
  data: ScVal;
  success: boolean;
}

export interface TransactionDataInfo {
  resources: {
    readBytes: number;
    writeBytes: number;
    instructionLeeway: number;
  };
  resourceFee: number;
}

export class XDRParser {
  decodeTransactionEnvelope(xdrBase64: string): DecodedTransactionEnvelope {
    const envelope = xdr.TransactionEnvelope.fromXDR(xdrBase64, 'base64');
    const envType = envelope.switch().name;

    let tx: xdr.Transaction;
    if (envType === 'envelopeTypeTx') {
      tx = envelope.v1().tx();
    } else {
      return { sourceAccount: '', fee: 0, sequence: '0', operations: [] };
    }

    const sourceAccount = this.decodeMuxedAccount(tx.sourceAccount());
    const fee = tx.fee();
    const sequence = tx.seqNum().toString();
    const memoVal = tx.memo().value();
    const memo = memoVal ? String(memoVal) : undefined;

    const operations: DecodedOperation[] = tx.operations().map((op) => {
      const body = op.body();
      const bodyType = body.switch().name;

      if (bodyType === 'invokeHostFunction') {
        const invoke = body.invokeHostFunctionOp();
        const hostFunc = invoke.hostFunction();
        const funcType = hostFunc.switch().name;

        if (funcType === 'hostFunctionTypeInvokeContract') {
          const contractFn = hostFunc.invokeContract();
          const contractId = Buffer.from(contractFn.contractAddress().contractId()).toString('hex');
          const functionName = contractFn.functionName().toString();
          const args = contractFn.args().map((a: xdr.ScVal) => this.decodeScVal(a));
          return { type: 'invokeContract', contractId, functionName, args };
        }

        if (funcType === 'hostFunctionTypeUploadContractWasm') {
          return { type: 'uploadContractWasm' };
        }

        if (funcType === 'hostFunctionTypeCreateContract') {
          return { type: 'createContract' };
        }

        return { type: `invokeHostFunction_${funcType}` };
      }

      return { type: bodyType };
    });

    return { sourceAccount, fee, sequence, operations, memo };
  }

  encodeScVal(arg: ScVal): xdr.ScVal {
    switch (arg.type) {
      case 'address': {
        const addr = new Address(arg.value as string);
        return addr.toScVal();
      }
      case 'i128':
        return xdr.ScVal.scvI128(
          new xdr.Int128Parts({ hi: new xdr.Int64(0), lo: new xdr.Uint64(String(arg.value)) }),
        );
      case 'u64':
        return xdr.ScVal.scvU64(new xdr.Uint64(String(arg.value)));
      case 'i64':
        return xdr.ScVal.scvI64(new xdr.Int64(String(arg.value)));
      case 'u32':
        return xdr.ScVal.scvU32(arg.value as number);
      case 'i32':
        return xdr.ScVal.scvI32(arg.value as number);
      case 'bool':
        return xdr.ScVal.scvBool(arg.value as boolean);
      case 'symbol':
        return xdr.ScVal.scvSymbol(arg.value as string);
      case 'string':
        return xdr.ScVal.scvString(arg.value as string);
      case 'bytes': {
        const buf = Buffer.from(arg.value as string, 'hex');
        return xdr.ScVal.scvBytes(buf);
      }
      case 'vec': {
        const items = (arg.value as ScVal[]).map((a) => this.encodeScVal(a));
        return xdr.ScVal.scvVec(items);
      }
      case 'map': {
        const entries = (arg.value as Array<{ key: ScVal; value: ScVal }>).map((entry) =>
          new xdr.ScMapEntry({ key: this.encodeScVal(entry.key), val: this.encodeScVal(entry.value) }),
        );
        return xdr.ScVal.scvMap(entries);
      }
      case 'void':
      default:
        return xdr.ScVal.scvVoid();
    }
  }

  decodeScVal(val: xdr.ScVal): ScVal {
    const arm = val.switch().name;

    switch (arm) {
      case 'scvVoid':
        return { type: 'void', value: null };
      case 'scvU32':
        return { type: 'u32', value: val.u32() };
      case 'scvI32':
        return { type: 'i32', value: val.i32() };
      case 'scvU64':
        return { type: 'u64', value: val.u64().toString() };
      case 'scvI64':
        return { type: 'i64', value: val.i64().toString() };
      case 'scvU128': {
        const u128 = val.u128();
        return { type: 'i128', value: { hi: u128.hi().toString(), lo: u128.lo().toString() } };
      }
      case 'scvI128': {
        const i128 = val.i128();
        return { type: 'i128', value: { hi: i128.hi().toString(), lo: i128.lo().toString() } };
      }
      case 'scvBool':
        return { type: 'bool', value: val.b() };
      case 'scvSymbol':
        return { type: 'symbol', value: val.sym().toString() };
      case 'scvString':
        return { type: 'string', value: val.str().toString() };
      case 'scvBytes':
        return { type: 'bytes', value: Buffer.from(val.bytes()).toString('hex') };
      case 'scvVec': {
        const items: ScVal[] = (val.vec() ?? []).map((v: xdr.ScVal) => this.decodeScVal(v));
        return { type: 'vec', value: items };
      }
      case 'scvMap': {
        const entries = (val.map() ?? []).map((entry: xdr.ScMapEntry) => ({
          key: this.decodeScVal(entry.key()),
          value: this.decodeScVal(entry.val()),
        }));
        return { type: 'map', value: entries };
      }
      case 'scvAddress': {
        const addr = Address.fromScVal(val);
        return { type: 'address', value: addr.toString() };
      }
      default:
        return { type: 'void', value: null };
    }
  }

  parseDiagnosticEvent(event: xdr.DiagnosticEvent): DiagnosticEventInfo {
    const success = event.inSuccessfulContractCall();
    const contractEvent = event.event();
    const body = contractEvent.body();

    const contractIdBuf = contractEvent.contractId();
    const contractId = contractIdBuf ? Buffer.from(contractIdBuf).toString('hex') : '';

    let topics: ScVal[] = [];
    let functionName: string | undefined;
    let data: ScVal = { type: 'void', value: null };

    const bodyArm = body.switch();
    if (bodyArm === 0) {
      const v0 = body.v0();
      topics = v0.topics().map((t: xdr.ScVal) => this.decodeScVal(t));
      data = this.decodeScVal(v0.data());

      const topic0 = topics[0];
      if (topic0?.type === 'symbol' && typeof topic0.value === 'string') {
        functionName = topic0.value;
      }
    }

    return { contractId, functionName, topics, data, success };
  }

  parseDiagnosticEvents(events: xdr.DiagnosticEvent[]): DiagnosticEventInfo[] {
    return (events ?? []).map((e) => this.parseDiagnosticEvent(e));
  }

  extractTransactionData(transactionData: xdr.SorobanTransactionData): TransactionDataInfo {
    const resources = transactionData.resources();
    const footprint = resources.footprint();
    const readBytes = resources.readBytes();
    const writeBytes = resources.writeBytes();
    const instructionLeeway = resources.instructions();
    const resourceFee = parseInt(transactionData.resourceFee().toString(), 10);

    return {
      resources: { readBytes, writeBytes, instructionLeeway },
      resourceFee,
    };
  }

  private decodeMuxedAccount(muxed: xdr.MuxedAccount): string {
    try {
      const type = muxed.switch().name;
      if (type === 'keyTypeEd25519') {
        return Buffer.from(muxed.ed25519()).toString('hex');
      }
      return `muxed:${type}`;
    } catch {
      return 'unknown';
    }
  }
}

export function createXDRParser(): XDRParser {
  return new XDRParser();
}
