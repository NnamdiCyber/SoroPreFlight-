import { describe, it, expect } from 'vitest';
import { ContractAuditor, createContractAudit } from '../ContractAuditor';

const SAFE_CONTRACT = `
#![no_std]
use soroban_sdk::{contract, contractimpl, Env, Address, Symbol, symbol_short};

#[contract]
pub struct TokenContract;

#[contractimpl]
impl TokenContract {
    pub fn init(env: Env, admin: Address) {
        env.storage().instance().set(&symbol_short!("admin"), &admin);
    }

    pub fn transfer(env: Env, from: Address, to: Address, amount: i128) {
        from.require_auth();
        let balance: i128 = env.storage().instance().get(&symbol_short!("balance")).unwrap_or(0);
        if balance < amount {
            panic!("insufficient balance");
        }
        let new_from = balance - amount;
        env.storage().instance().set(&symbol_short!("balance"), &new_from);
    }
}
`;

const VULNERABLE_CONTRACT = `
#![no_std]
use soroban_sdk::{contract, contractimpl, Env, Address, Symbol};

#[contract]
pub struct VulnerableContract;

#[contractimpl]
impl VulnerableContract {
    pub fn unsafe_transfer(env: Env, to: Address, amount: i128) {
        let balance: i128 = env.storage().instance().get(&Symbol::new(&env, "balance")).unwrap();
        let new_balance = balance - amount;
        env.storage().instance().set(&Symbol::new(&env, "balance"), &new_balance);
        to.require_auth();
    }

    pub fn unchecked_add(env: Env, a: u64, b: u64) -> u64 {
        a + b
    }

    pub fn swap(env: Env, amount: i128) -> i128 {
        let rate = env.storage().instance().get(&Symbol::new(&env, "rate")).unwrap();
        amount * rate
    }
}
`;

describe('ContractAuditor', () => {
  it('should find no high-severity issues in safe contract', () => {
    const audit = createContractAudit(undefined, SAFE_CONTRACT, 'audit');

    expect(audit.overallRisk).not.toBe('critical');
    expect(audit.overallRisk).not.toBe('high');
    expect(audit.vulnerabilities.filter(v => v.severity === 'high')).toHaveLength(0);
  });

  it('should detect integer overflow in vulnerable contract', () => {
    const audit = createContractAudit(undefined, VULNERABLE_CONTRACT, 'audit');

    const overflowIssues = audit.vulnerabilities.filter(v => v.type === 'integer-overflow');
    expect(overflowIssues.length).toBeGreaterThanOrEqual(1);
  });

  it('should detect reentrancy patterns', () => {
    const audit = createContractAudit(undefined, VULNERABLE_CONTRACT, 'audit');

    const reentrancyIssues = audit.vulnerabilities.filter(v => v.type === 'reentrancy');
    expect(reentrancyIssues.length).toBeGreaterThanOrEqual(1);
  });

  it('should detect missing access control', () => {
    const audit = createContractAudit(undefined, VULNERABLE_CONTRACT, 'audit');

    expect(audit.accessControlIssues.length).toBeGreaterThanOrEqual(1);
  });

  it('should detect economic attack surface', () => {
    const audit = createContractAudit(undefined, VULNERABLE_CONTRACT, 'audit');

    expect(audit.economicAttackSurface.length).toBeGreaterThanOrEqual(1);
  });

  it('should report best practice violations without source', () => {
    const audit = createContractAudit(undefined, '', 'audit');

    expect(audit.bestPracticeViolations.length).toBeGreaterThanOrEqual(1);
  });

  it('should report limited analysis without source', () => {
    const audit = createContractAudit('some-wasm-bytes', undefined, 'audit');

    expect(audit.bestPracticeViolations.some(v => v.includes('Source code not provided'))).toBe(true);
  });

  it('should return low risk for no code', () => {
    const audit = createContractAudit(undefined, undefined, 'audit');

    expect(audit.overallRisk).toBe('low');
    expect(audit.vulnerabilities).toHaveLength(0);
  });

  it('should detect unchecked arithmetic patterns', () => {
    const source = `
      pub fn add(a: u64, b: u64) -> u64 {
          a + b
      }
    `;
    const audit = createContractAudit(undefined, source, 'audit');

    const overflowIssues = audit.vulnerabilities.filter(v => v.type === 'integer-overflow');
    expect(overflowIssues.length).toBeGreaterThanOrEqual(1);
  });

  it('should detect panic usage', () => {
    const source = `
      use soroban_sdk::env;
      pub fn fail() {
          panic!("something went wrong");
      }
    `;
    const audit = createContractAudit(undefined, source, 'audit');

    expect(audit.bestPracticeViolations.some(v => v.includes('panic'))).toBe(true);
  });

  it('should provide remediation steps', () => {
    const audit = createContractAudit(undefined, VULNERABLE_CONTRACT, 'audit');

    for (const v of audit.vulnerabilities) {
      expect(v.remediation).toBeTruthy();
    }
  });

  it('should create auditor with contractId', () => {
    const auditor = new ContractAuditor({
      source: SAFE_CONTRACT,
      analysisLevel: 'audit',
      contractId: 'CA3D5KRYM6CB7OWQ6TWYRR3Z4T7GNZLKERYNZGGA5SOAOPIFY6YQGAXE',
    });
    const audit = auditor.audit();

    expect(audit).toBeDefined();
  });

  it('should assign severity correctly', () => {
    const audit = createContractAudit(undefined, VULNERABLE_CONTRACT, 'audit');

    for (const v of audit.vulnerabilities) {
      expect(['low', 'medium', 'high', 'critical']).toContain(v.severity);
    }
  });
});
