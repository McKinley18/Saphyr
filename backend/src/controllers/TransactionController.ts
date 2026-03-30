import { Response } from 'express';
import { TransactionService } from '../services/TransactionService.js';
import { AuthRequest } from '../middleware/authMiddleware.js';

export class TransactionController {
  static async createTransaction(req: AuthRequest, res: Response) {
    try {
      const userId = req.userId;
      const transaction = await TransactionService.createTransaction({
        ...req.body,
        user_id: userId
      });
      res.status(201).json(transaction);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async getTransactions(req: AuthRequest, res: Response) {
    try {
      const userId = req.userId;
      const transactions = await TransactionService.getTransactionsByUserId(userId as string);
      res.json(transactions);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
}
