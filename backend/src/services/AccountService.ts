import db from '../database/db.js';

export interface Account {
  id?: string;
  user_id: string;
  name: string;
  type: string;
  balance: number;
  interest_rate?: number;
  apr?: number;
  group_name?: string;
  is_bill?: boolean;
  monthly_deposit?: number;
  due_day?: number;
  loan_term?: number;
  currency?: string;
  created_at?: Date;
  updated_at?: Date;
}

export class AccountService {
  static async createAccount(account: Account) {
    return db('accounts').insert(account).returning('*');
  }

  static async getAccountsByUserId(userId: string) {
    return db('accounts').where({ user_id: userId }).select('*');
  }

  static async getAccountById(id: string) {
    return db('accounts').where({ id }).first();
  }

  static async updateBalance(accountId: string, amount: number) {
    return db('accounts')
      .where({ id: accountId })
      .increment('balance', amount)
      .returning('*');
  }
}
