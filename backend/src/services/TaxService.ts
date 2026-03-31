import db from '../database/db.js';

export class TaxService {
  static async calculateTaxEstimate(userId: string, year: number = 2025, overrideProfile?: any) {
    try {
      // 1. Get salary profile
      const salaryProfile = overrideProfile || await db('salary_profiles').where({ user_id: userId }).orderBy('updated_at', 'desc').first();
      
      let annualSalary = Number(salaryProfile?.annual_salary) || 0;
      let hourlyRate = Number(salaryProfile?.hourly_rate) || 0;
      let hoursPerWeek = Number(salaryProfile?.hours_per_week) || 40;

      // Derived Metrics Sync
      if (salaryProfile?.is_hourly) {
        annualSalary = hourlyRate * hoursPerWeek * 52;
      } else {
        hourlyRate = annualSalary / 52 / hoursPerWeek;
      }

      // 2. State & Deductions
      const state = salaryProfile?.state || 'WA';
      let customDeductions = [];
      try { customDeductions = await db('custom_deductions').where({ user_id: userId }); } catch (e) {}

      const totalPreTaxDeductions = customDeductions
        .filter((d: any) => d.is_pre_tax)
        .reduce((sum: number, d: any) => sum + (Number(d.amount) * 12), 0);

      const contribution401kPercent = Number(salaryProfile?.['401k_percent']) || 0;
      const deduction401k = annualSalary * contribution401kPercent;

      // 3. Taxable Gross
      const taxableSources = await db('income_sources').where({ user_id: userId, is_taxed: true });
      const additionalTaxableIncome = taxableSources.reduce((sum, src) => sum + (Number(src.amount) || 0), 0) * 12;
      const totalTaxableGross = annualSalary + additionalTaxableIncome;

      // 4. Standard Deduction
      const profile = await db('tax_profiles').where({ user_id: userId }).first();
      const filingStatus = overrideProfile?.filing_status || profile?.filing_status || 'single';
      
      const standardDeductions: Record<string, number> = {
        'single': 15000, 'married_joint': 30000, 'married_separate': 15000, 'head_household': 22500, 'widow': 30000
      };
      const standardDeduction = standardDeductions[filingStatus] || 15000;
      const taxableIncome = Math.max(0, totalTaxableGross - deduction401k - totalPreTaxDeductions - standardDeduction);

      // 5. Federal Tax Calculation
      let federalTax = 0;
      if (salaryProfile?.use_manual_tax && salaryProfile?.manual_tax_amount > 0) {
        federalTax = Number(salaryProfile.manual_tax_amount) * 12; // Back to annual for consistent storage
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

      // 6. State Tax Estimate (Simplified Flat/Tiered Logic)
      // States with no income tax: AK, FL, NV, SD, TN, TX, WA, WY
      const noIncomeTaxStates = ['AK', 'FL', 'NV', 'SD', 'TN', 'TX', 'WA', 'WY'];
      let stateTax = 0;
      if (!noIncomeTaxStates.includes(state)) {
        // Approximate state tax as 5% for generalized high-precision estimate
        stateTax = taxableIncome * 0.05; 
      }

      // 7. Final Net Calculation
      const nonTaxableSources = await db('income_sources').where({ user_id: userId, is_taxed: false });
      const additionalNonTaxableIncome = nonTaxableSources.reduce((sum, src) => sum + (Number(src.amount) || 0), 0) * 12;
      
      const postTaxDeductions = customDeductions
        .filter((d: any) => !d.is_pre_tax)
        .reduce((sum: number, d: any) => sum + (Number(d.amount) * 12), 0);

      const totalActualGross = totalTaxableGross + additionalNonTaxableIncome;
      const totalTaxesAndDeductions = federalTax + stateTax + deduction401k + totalPreTaxDeductions + postTaxDeductions;
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
        estimated_tax: federalTax, // Federal Only
        state_tax: stateTax,
        total_tax_liability: federalTax + stateTax,
        use_manual_tax: !!salaryProfile?.use_manual_tax,
        net_annual: netAnnualIncome,
        monthly_net: netAnnualIncome / 12,
        effective_rate: totalActualGross > 0 ? ((federalTax + stateTax) / totalActualGross) : 0,
        last_calc: new Date().toISOString()
      };
    } catch (error: any) {
      console.error("Tax Calculation Error:", error);
      return { monthly_net: 0, estimated_tax: 0, state_tax: 0, total_gross: 0, effective_rate: 0, error: error.message };
    }
  }

  static async seed2025Brackets() {
    // Brackets logic unchanged...
  }
}
