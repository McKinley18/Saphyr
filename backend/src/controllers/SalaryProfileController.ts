import { Response } from 'express';
import db from '../database/db.js';
import { AuthRequest } from '../middleware/authMiddleware.js';

export class SalaryProfileController {
  static async getSalaryProfile(req: AuthRequest, res: Response) {
    try {
      const userId = req.userId;
      const profile = await db('salary_profiles').where({ user_id: userId }).first();
      res.json(profile || { annual_salary: 0, contribution_401k_percent: 0 });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async updateSalaryProfile(req: AuthRequest, res: Response) {
    try {
      const userId = req.userId;
      const { annual_salary, contribution_401k_percent } = req.body;
      
      const existing = await db('salary_profiles').where({ user_id: userId }).first();
      
      if (existing) {
        await db('salary_profiles').where({ user_id: userId }).update({
          annual_salary,
          contribution_401k_percent,
          updated_at: new Date()
        });
      } else {
        await db('salary_profiles').insert({
          user_id: userId,
          annual_salary,
          contribution_401k_percent
        });
      }
      res.json({ message: 'Salary profile updated' });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
}
