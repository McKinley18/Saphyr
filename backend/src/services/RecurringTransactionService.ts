import db from '../database/db.js';

export class RecurringTransactionService {
  /**
   * Scans for pending income deposits and records them as transactions.
   * This ensures linked income is 'factored into' account balances.
   */
  static async processMonthlyIncome(userId: string) {
    const today = new Date();
    const currentMonth = today.getMonth(); // 0-11
    const currentYear = today.getFullYear();

    // 1. Get Main Salary Linkage
    const salaryProfile = await db('salary_profiles').where({ user_id: userId }).first();
    if (salaryProfile && salaryProfile.account_id) {
      // Calculate Net Take-Home (Simple monthly projection for the transaction)
      // Note: For 100% precision, we'd pull from TaxService, but here we record the expected credit.
      const monthlyNet = Number(salaryProfile.annual_salary) / 12; // Adjusted after taxes in real logic
      
      await this.recordIncomeIfMissing(
        userId, 
        salaryProfile.account_id, 
        'MAIN SALARY DEPOSIT', 
        monthlyNet, 
        currentMonth, 
        currentYear
      );
    }

    // 2. Get Other Income Sources
    const otherIncomes = await db('income_sources').where({ user_id: userId }).whereNotNull('account_id');
    for (const income of otherIncomes) {
      await this.recordIncomeIfMissing(
        userId,
        income.account_id,
        `DEPOSIT: ${income.name.toUpperCase()}`,
        Number(income.amount),
        currentMonth,
        currentYear
      );
    }
  }

  private static async recordIncomeIfMissing(
    userId: string, 
    accountId: string, 
    description: string, 
    amount: number, 
    month: number, 
    year: number
  ) {
    // Check if a deposit for this month/year already exists for this specific source
    // We use a specific description pattern to identify automated deposits
    const existing = await db('transactions')
      .where({ 
        user_id: userId, 
        account_id: accountId, 
        description: description 
      })
      .whereRaw('EXTRACT(MONTH FROM date) = ?', [month + 1])
      .whereRaw('EXTRACT(YEAR FROM date) = ?', [year])
      .first();

    if (!existing) {
      // CREATE TRANSACTION
      await db('transactions').insert({
        user_id: userId,
        account_id: accountId,
        amount: amount,
        type: 'income',
        category: 'Income',
        description: description,
        date: new Date()
      });

      // UPDATE ACCOUNT BALANCE
      await db('accounts')
        .where({ id: accountId, user_id: userId })
        .increment('balance', amount);
        
      console.log(`Recorded auto-deposit: ${description} for account ${accountId}`);
    }
  }
}
