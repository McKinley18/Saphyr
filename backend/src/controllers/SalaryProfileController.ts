import { Response } from 'express';
import db from '../database/db.js';
import { AuthRequest } from '../middleware/authMiddleware.js';
import { TaxService } from '../services/TaxService.js';

export class SalaryProfileController {
  static async getSalaryProfile(req: AuthRequest, res: Response) {
    try {
      const userId = req.userId;
      const profile = await db('salary_profiles').where({ user_id: userId }).orderBy('updated_at', 'desc').first();
      const taxProfile = await db('tax_profiles').where({ user_id: userId }).first();
      const deductions = await db('custom_deductions').where({ user_id: userId });
      
      if (profile) {
        res.json({
          annual_salary: Number(profile.annual_salary) || 0,
          '401k_percent': (Number(profile['401k_percent']) || 0) * 100,
          filing_status: taxProfile?.filing_status || 'single',
          hourly_rate: Number(profile.hourly_rate) || 0,
          hours_per_week: Number(profile.hours_per_week) || 0,
          is_hourly: !!profile.is_hourly,
          manual_tax_amount: Number(profile.manual_tax_amount) || 0,
          use_manual_tax: !!profile.use_manual_tax,
          custom_deductions: deductions,
          updated_at: profile.updated_at
        });
      } else {
        res.json({ annual_salary: 0, '401k_percent': 0, filing_status: 'single', is_hourly: false, custom_deductions: [] });
      }
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async updateSalaryProfile(req: AuthRequest, res: Response) {
    try {
      const userId = req.userId;
      const { 
        annual_salary, 
        contribution_401k_percent, 
        filing_status,
        hourly_rate,
        hours_per_week,
        is_hourly,
        manual_tax_amount,
        use_manual_tax
      } = req.body;
      
      const salaryNum = parseFloat(annual_salary) || 0;
      const pctDecimal = (parseFloat(contribution_401k_percent) || 0) / 100;

      const profileData = {
        annual_salary: salaryNum,
        '401k_percent': pctDecimal,
        hourly_rate: parseFloat(hourly_rate) || 0,
        hours_per_week: parseInt(hours_per_week) || 0,
        is_hourly: !!is_hourly,
        manual_tax_amount: parseFloat(manual_tax_amount) || 0,
        use_manual_tax: !!use_manual_tax,
        updated_at: new Date()
      };

      const existingSal = await db('salary_profiles').where({ user_id: userId }).first();
      if (existingSal) {
        await db('salary_profiles').where({ user_id: userId }).update(profileData);
      } else {
        await db('salary_profiles').insert({ user_id: userId, ...profileData });
      }

      if (filing_status) {
        const existingTax = await db('tax_profiles').where({ user_id: userId }).first();
        if (existingTax) {
          await db('tax_profiles').where({ user_id: userId }).update({ filing_status, updated_at: new Date() });
        } else {
          await db('tax_profiles').insert({ user_id: userId, filing_status, region: 'federal' });
        }
      }
      
      const newEstimate = await TaxService.calculateTaxEstimate(userId as string, 2025, {
        ...profileData,
        filing_status
      });
      
      res.json({ message: 'Profile updated', taxEstimate: newEstimate });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async addCustomDeduction(req: AuthRequest, res: Response) {
    try {
      const userId = req.userId;
      const { name, amount, is_pre_tax } = req.body;
      await db('custom_deductions').insert({
        user_id: userId,
        name,
        amount: parseFloat(amount) || 0,
        is_pre_tax: !!is_pre_tax
      });
      const newEstimate = await TaxService.calculateTaxEstimate(userId as string);
      res.json({ message: 'Deduction added', taxEstimate: newEstimate });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async deleteCustomDeduction(req: AuthRequest, res: Response) {
    try {
      const userId = req.userId;
      const { id } = req.params;
      await db('custom_deductions').where({ id, user_id: userId }).del();
      const newEstimate = await TaxService.calculateTaxEstimate(userId as string);
      res.json({ message: 'Deduction deleted', taxEstimate: newEstimate });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
}
