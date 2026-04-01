import db from '../database/db.js';

export class TaxService {
  static getAnnualMultiplier(frequency: string) {
    const f = (frequency || 'monthly').toLowerCase();
    switch (f) {
      case 'bi-weekly': return 26;
      case 'weekly': return 52;
      default: return 12; // monthly
    }
  }

  static async calculateTaxEstimate(userId: string, year: number = 2025, overrideProfile?: any) {
    try {
      const salaryProfile = overrideProfile || await db('salary_profiles').where({ user_id: userId }).orderBy('updated_at', 'desc').first();
      
      let annualSalary = Number(salaryProfile?.annual_salary) || 0;
      let hourlyRate = Number(salaryProfile?.hourly_rate) || 0;
      let hoursPerWeek = Number(salaryProfile?.hours_per_week) || 40;

      if (salaryProfile?.is_hourly) {
        annualSalary = hourlyRate * hoursPerWeek * 52;
      } else {
        hourlyRate = annualSalary / 52 / hoursPerWeek;
      }

      const ficaSocialSecurity = Math.min(annualSalary, 176100) * 0.062;
      let ficaMedicare = annualSalary * 0.0145;
      
      const profile = await db('tax_profiles').where({ user_id: userId }).first();
      const filingStatus = overrideProfile?.filing_status || profile?.filing_status || 'single';
      
      const additionalMedicareThreshold = (filingStatus === 'married_joint' || filingStatus === 'widow') ? 250000 : 200000;
      if (annualSalary > additionalMedicareThreshold) {
        ficaMedicare += (annualSalary - additionalMedicareThreshold) * 0.009;
      }
      
      const totalFica = ficaSocialSecurity + ficaMedicare;

      const state = salaryProfile?.state || 'WA';
      let customDeductions = [];
      try { customDeductions = await db('custom_deductions').where({ user_id: userId }); } catch (e) {}

      const totalPreTaxDeductions = customDeductions
        .filter((d: any) => d.is_pre_tax)
        .reduce((sum: number, d: any) => sum + (Number(d.amount) * this.getAnnualMultiplier(d.frequency)), 0);

      const contribution401kPercent = Number(salaryProfile?.['401k_percent']) || 0;
      const deduction401k = annualSalary * contribution401kPercent;

      const taxableSources = await db('income_sources').where({ user_id: userId, is_taxed: true });
      const additionalTaxableIncome = taxableSources.reduce((sum, src) => sum + (Number(src.amount) * this.getAnnualMultiplier(src.frequency)), 0);
      const totalTaxableGross = annualSalary + additionalTaxableIncome;

      const standardDeductions: Record<string, number> = {
        'single': 15000, 'married_joint': 30000, 'married_separate': 15000, 'head_household': 22500, 'widow': 30000
      };
      const standardDeduction = standardDeductions[filingStatus] || 15000;
      const taxableIncome = Math.max(0, totalTaxableGross - deduction401k - totalPreTaxDeductions - standardDeduction);

      let federalTax = 0;
      if (salaryProfile?.use_manual_tax && salaryProfile?.manual_tax_amount > 0) {
        federalTax = Number(salaryProfile.manual_tax_amount) * 12; 
      } else {
        const brackets = await db('tax_brackets')
          .where({ filing_status: (filingStatus === 'widow' ? 'married_joint' : filingStatus === 'married_separate' ? 'single' : filingStatus), year })
          .orderBy('lower_bound', 'asc');

        if (brackets.length === 0) {
          federalTax = taxableIncome * 0.15; 
        } else {
          for (const bracket of brackets) {
            const lower = Number(bracket.lower_bound);
            const upper = bracket.upper_bound ? Number(bracket.upper_bound) : Infinity;
            const taxableInThisBracket = Math.min(Math.max(0, taxableIncome - lower), upper - lower);
            federalTax += taxableInThisBracket * Number(bracket.rate);
          }
        }
      }

      const noIncomeTaxStates = ['AK', 'FL', 'NV', 'SD', 'TN', 'TX', 'WA', 'WY'];
      let stateTax = 0;
      if (!noIncomeTaxStates.includes(state)) {
        stateTax = taxableIncome * 0.05; 
      }

      const nonTaxableSources = await db('income_sources').where({ user_id: userId, is_taxed: false });
      const additionalNonTaxableIncome = nonTaxableSources.reduce((sum, src) => sum + (Number(src.amount) * this.getAnnualMultiplier(src.frequency)), 0);
      
      const postTaxDeductions = customDeductions
        .filter((d: any) => !d.is_pre_tax)
        .reduce((sum: number, d: any) => sum + (Number(d.amount) * this.getAnnualMultiplier(d.frequency)), 0);

      const totalActualGross = totalTaxableGross + additionalNonTaxableIncome;
      const totalTaxesAndDeductions = federalTax + stateTax + totalFica + deduction401k + totalPreTaxDeductions + postTaxDeductions;
      const netAnnualIncome = totalActualGross - totalTaxesAndDeductions;

      return {
        year,
        state,
        filing_status: filingStatus,
        annual_salary: annualSalary,
        hourly_rate: hourlyRate,
        hours_per_week: hoursPerWeek,
        is_hourly: !!salaryProfile?.is_hourly,
        deduction_401k: deduction401k,
        total_pre_tax_deductions: totalPreTaxDeductions,
        total_post_tax_deductions: postTaxDeductions,
        total_gross: totalActualGross,
        taxable_income: taxableIncome,
        estimated_tax: federalTax,
        state_tax: stateTax,
        fica_tax: totalFica,
        fica_breakdown: { social_security: ficaSocialSecurity, medicare: ficaMedicare },
        total_tax_liability: federalTax + stateTax + totalFica,
        use_manual_tax: !!salaryProfile?.use_manual_tax,
        net_annual: netAnnualIncome,
        monthly_net: netAnnualIncome / 12,
        effective_rate: totalActualGross > 0 ? ((federalTax + stateTax + totalFica) / totalActualGross) : 0,
        last_calc: new Date().toISOString()
      };
    } catch (error: any) {
      console.error("Tax Calculation Error:", error);
      return { monthly_net: 0, estimated_tax: 0, state_tax: 0, fica_tax: 0, total_gross: 0, effective_rate: 0, error: error.message };
    }
  }

  static async seed2025Brackets() {
    // Brackets logic unchanged...
  }
}
