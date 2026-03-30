import { Response } from 'express';
import db from '../database/db.js';
import { AuthRequest } from '../middleware/authMiddleware.js';

export class BudgetController {
  static async getBudgets(req: AuthRequest, res: Response) {
    try {
      const userId = req.userId;
      const budgets = await db('budget_categories').where({ user_id: userId }).orderBy('name', 'asc');
      res.json(budgets);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async createBudget(req: AuthRequest, res: Response) {
    try {
      const userId = req.userId;
      const { name, monthly_limit } = req.body;
      const [budget] = await db('budget_categories').insert({
        user_id: userId,
        name,
        monthly_limit
      }).returning('*');
      res.status(201).json(budget);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async deleteBudget(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.userId;
      await db('budget_categories').where({ id, user_id: userId }).del();
      res.json({ message: 'Budget deleted' });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
}
