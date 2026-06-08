#![no_std]
use soroban_sdk::{contract, contractimpl, contracttype, Address, Env, String};

#[contracttype]
pub struct AllowanceDataKey {
    pub from: Address,
    pub spender: Address,
}

#[contracttype]
pub enum DataKey {
    Balance(Address),
    Allowance(AllowanceDataKey),
    Admin(Address),
    Name,
    Symbol,
    Decimals,
}

#[contract]
pub struct TokenContract;

#[contractimpl]
impl TokenContract {
    pub fn init(env: Env, admin: Address, name: String, symbol: String) {
        env.storage().instance().set(&DataKey::Admin(admin.clone()), &admin);
        env.storage().instance().set(&DataKey::Name, &name);
        env.storage().instance().set(&DataKey::Symbol, &symbol);
        env.storage().instance().set(&DataKey::Decimals, &7u32);
    }

    pub fn transfer(env: Env, from: Address, to: Address, amount: i128) {
        from.require_auth();
        let from_balance = Self::balance(&env, from.clone());
        if from_balance < amount {
            panic!("insufficient balance");
        }
        let to_balance = Self::balance(&env, to.clone());
        env.storage().instance().set(&DataKey::Balance(from), &(from_balance - amount));
        env.storage().instance().set(&DataKey::Balance(to), &(to_balance + amount));
    }

    pub fn balance(env: &Env, addr: Address) -> i128 {
        env.storage()
            .instance()
            .get(&DataKey::Balance(addr))
            .unwrap_or(0)
    }

    pub fn mint(env: Env, to: Address, amount: i128) {
        let admin = Self::admin(&env);
        admin.require_auth();
        let balance = Self::balance(&env, to.clone());
        env.storage()
            .instance()
            .set(&DataKey::Balance(to), &(balance + amount));
    }

    pub fn admin(env: &Env) -> Address {
        env.storage()
            .instance()
            .get(&DataKey::Admin(Address::new(env.current_contract_address().clone())))
            .unwrap()
    }
}
