import { Response } from 'express';
import db from '../database/db.js';
import { AuthRequest } from '../middleware/authMiddleware.js';

export class SavingsGoalController {
  static async getGoals(req: AuthRequest, res: Response) {
    try {
      const userId = req.userId;
      const goals = await db('savings_goals').where({ user_id: userId }).orderBy('created_at', 'asc');
      res.json(goals);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async createGoal(req: AuthRequest, res: Response) {
    try {
      const userId = req.userId;
      const { name, target_amount, current_amount, color, monthly_contribution, account_id } = req.body;
      const [goal] = await db('savings_goals').insert({
        user_id: userId,
        name,
        target_amount,
        current_amount: current_amount || 0,
        color: color || '#3b82f6',
        monthly_contribution: monthly_contribution || 0,
        account_id: account_id || null
      }).returning('*');
      res.status(201).json(goal);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async updateGoal(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.userId;
      const [goal] = await db('savings_goals').where({ id, user_id: userId }).update(req.body).returning('*');
      res.json(goal);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async deleteGoal(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.userId;
      await db('savings_goals').where({ id, user_id: userId }).del();
      res.json({ message: 'Goal deleted' });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
}
