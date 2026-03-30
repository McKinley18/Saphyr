import db from '../database/db.js';

export interface Transaction {
  id?: string;
  user_id: string;
  account_id: string;
  to_account_id?: string;
  type: 'income' | 'expense' | 'transfer';
  amount: number;
  category: string;
  description?: string;
  date: Date;
  is_taxable?: boolean;
}

export class TransactionService {
  static async createTransaction(transaction: Transaction) {
    return db.transaction(async (trx) => {
      // 1. Insert Transaction
      const [newTransaction] = await trx('transactions').insert(transaction).returning('*');

      // 2. Update Account Balances
      if (transaction.type === 'income') {
        await trx('accounts')
          .where({ id: transaction.account_id })
          .increment('balance', transaction.amount);
      } else if (transaction.type === 'expense') {
        await trx('accounts')
          .where({ id: transaction.account_id })
          .decrement('balance', transaction.amount);
      } else if (transaction.type === 'transfer' && transaction.to_account_id) {
        // Debit from source
        await trx('accounts')
          .where({ id: transaction.account_id })
          .decrement('balance', transaction.amount);
        // Credit to destination
        await trx('accounts')
          .where({ id: transaction.to_account_id })
          .increment('balance', transaction.amount);
      }

      return newTransaction;
    });
  }

  static async getTransactionsByUserId(userId: string) {
    return db('transactions').where({ user_id: userId }).orderBy('date', 'desc');
  }

  static async getTransactionsByAccountId(accountId: string) {
    return db('transactions').where({ account_id: accountId }).orderBy('date', 'desc');
  }
}
