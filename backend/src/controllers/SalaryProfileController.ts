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
      
      // Handle the case where deductions table might not exist yet or fail
      let deductions = [];
      try {
        deductions = await db('custom_deductions').where({ user_id: userId });
      } catch (e) {
        console.warn("Deductions table not found, skipping.");
      }
      
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
      console.error("Salary Profile Error:", error);
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

      const profileData: any = {
        annual_salary: salaryNum,
        '401k_percent': pctDecimal,
        updated_at: new Date()
      };

      // Only add new columns if they exist in schema or handle them safely
      if (hourly_rate !== undefined) profileData.hourly_rate = parseFloat(hourly_rate) || 0;
      if (hours_per_week !== undefined) profileData.hours_per_week = parseInt(hours_per_week) || 0;
      if (is_hourly !== undefined) profileData.is_hourly = !!is_hourly;
      if (manual_tax_amount !== undefined) profileData.manual_tax_amount = parseFloat(manual_tax_amount) || 0;
      if (use_manual_tax !== undefined) profileData.use_manual_tax = !!use_manual_tax;

      const existingSal = await db('salary_profiles').where({ user_id: userId }).first();
      
      try {
        if (existingSal) {
          await db('salary_profiles').where({ user_id: userId }).update(profileData);
        } else {
          await db('salary_profiles').insert({ user_id: userId, ...profileData });
        }
      } catch (dbError: any) {
        // Fallback for missing columns: only update the basics
        console.error("DB Update failed, trying fallback basics:", dbError.message);
        const basicData = { annual_salary: salaryNum, '401k_percent': pctDecimal, updated_at: new Date() };
        if (existingSal) {
          await db('salary_profiles').where({ user_id: userId }).update(basicData);
        } else {
          await db('salary_profiles').insert({ user_id: userId, ...basicData });
        }
      }

      if (filing_status) {
        const existingTax = await db('tax_profiles').where({ user_id: userId }).first();
        if (existingTax) {
          await db('tax_profiles').where({ user_id: userId }).update({ filing_status, updated_at: new Date() });
        } else {
          await db('tax_profiles').insert({ user_id: userId, filing_status, region: 'federal' });
        }
      }
      
      const newEstimate = await TaxService.calculateTaxEstimate(userId as string, 2025);
      res.json({ message: 'Profile updated', taxEstimate: newEstimate });
    } catch (error: any) {
      console.error("Update Error:", error);
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
