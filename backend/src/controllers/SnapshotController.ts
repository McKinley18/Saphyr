import { Response } from 'express';
import db from '../database/db.js';
import { AuthRequest } from '../middleware/authMiddleware.js';

export class SnapshotController {
  static async getSnapshots(req: AuthRequest, res: Response) {
    try {
      const userId = req.userId;
      const snapshots = await db('daily_snapshots')
        .where({ user_id: userId })
        .orderBy('date', 'asc')
        .limit(30);
      res.json(snapshots);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async createSnapshot(req: AuthRequest, res: Response) {
    try {
      const userId = req.userId;
      const { net_worth, total_cash, total_debt } = req.body;
      const date = new Date().toISOString().split('T')[0];
      
      const existing = await db('daily_snapshots').where({ user_id: userId, date }).first();
      
      if (existing) {
        await db('daily_snapshots').where({ id: existing.id }).update({
          net_worth, total_cash, total_debt, updated_at: new Date()
        });
      } else {
        await db('daily_snapshots').insert({
          user_id: userId, date, net_worth, total_cash, total_debt
        });
      }
      res.json({ message: 'Snapshot saved' });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
}
