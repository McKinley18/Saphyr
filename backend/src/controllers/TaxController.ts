import { Response } from 'express';
import { TaxService } from '../services/TaxService.js';
import { AuthRequest } from '../middleware/authMiddleware.js';

export class TaxController {
  static async getEstimate(req: AuthRequest, res: Response) {
    try {
      const userId = req.userId;
      const estimate = await TaxService.calculateTaxEstimate(userId as string);
      res.json(estimate);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async seedBrackets(req: AuthRequest, res: Response) {
    try {
      await TaxService.seed2025Brackets();
      res.json({ message: 'Brackets seeded' });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
}
