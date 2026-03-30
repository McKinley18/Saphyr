import { Response } from 'express';
import db from '../database/db.js';
import { AuthRequest } from '../middleware/authMiddleware.js';

export class IncomeSourceController {
  static async getSources(req: AuthRequest, res: Response) {
    try {
      const userId = req.userId;
      const sources = await db('income_sources').where({ user_id: userId }).orderBy('created_at', 'asc');
      res.json(sources);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async createSource(req: AuthRequest, res: Response) {
    try {
      const userId = req.userId;
      const { name, amount, account_id } = req.body;
      const [source] = await db('income_sources').insert({
        user_id: userId,
        name,
        amount,
        account_id
      }).returning('*');
      res.status(201).json(source);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async deleteSource(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.userId;
      await db('income_sources').where({ id, user_id: userId }).del();
      res.json({ message: 'Source deleted' });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
}
