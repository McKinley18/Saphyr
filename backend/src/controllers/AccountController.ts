import { Response } from 'express';
import { AccountService } from '../services/AccountService.js';
import { AuthRequest } from '../middleware/authMiddleware.js';
import { RecurringTransactionService } from '../services/RecurringTransactionService.js';

export class AccountController {
  static async createAccount(req: AuthRequest, res: Response) {
    try {
      const userId = req.userId;
      const { name, type, balance, interest_rate, currency, group_name, apr, is_bill, monthly_deposit, due_day, loan_term } = req.body;
      const account = await AccountService.createAccount({
        user_id: userId,
        name,
        type,
        balance,
        interest_rate,
        currency,
        group_name,
        apr,
        is_bill,
        monthly_deposit,
        due_day,
        loan_term
      } as any);
      res.status(201).json(account);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async getAccounts(req: AuthRequest, res: Response) {
    try {
      const userId = req.userId;
      
      // AUTO-PROCESS RECURRING INCOME DEPOSITS
      try {
        await RecurringTransactionService.processMonthlyIncome(userId as string);
      } catch (err) {
        console.error("Auto-income process failed:", err);
      }

      const accounts = await AccountService.getAccountsByUserId(userId as string);
      res.json(accounts);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async getAccountById(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.userId;
      const account = await AccountService.getAccountById(id as string);
      
      if (!account || account.user_id !== userId) {
        return res.status(404).json({ error: 'Account not found' });
      }
      
      res.json(account);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
}
