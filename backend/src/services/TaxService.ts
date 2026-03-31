import db from '../database/db.js';

export class TaxService {
  static async calculateTaxEstimate(userId: string, year: number = 2025, overrideProfile?: any) {
    // 1. Get salary profile
    const salaryProfile = overrideProfile || await db('salary_profiles').where({ user_id: userId }).orderBy('updated_at', 'desc').first();
    
    let annualSalary = Number(salaryProfile?.annual_salary) || 0;
    
    // If hourly, calculate annual
    if (salaryProfile?.is_hourly) {
      const rate = Number(salaryProfile.hourly_rate) || 0;
      const hours = Number(salaryProfile.hours_per_week) || 40;
      annualSalary = rate * hours * 52;
    }

    // 2. Get Custom Deductions (e.g. Health Insurance, HSA)
    const customDeductions = await db('custom_deductions').where({ user_id: userId });
    const totalPreTaxDeductions = customDeductions
      .filter(d => d.is_pre_tax)
      .reduce((sum, d) => sum + (Number(d.amount) * 12), 0);

    // 3. Get 401k %
    const contribution401kPercent = Number(salaryProfile?.['401k_percent']) || 0;
    const deduction401k = annualSalary * contribution401kPercent;

    // 4. Get additional income sources that are TAXED
    const taxableSources = await db('income_sources').where({ user_id: userId, is_taxed: true });
    const additionalTaxableIncome = taxableSources.reduce((sum, src) => sum + (Number(src.amount) || 0), 0) * 12;

    const totalTaxableGross = annualSalary + additionalTaxableIncome;

    // 5. Filing Status & Standard Deduction
    const profile = await db('tax_profiles').where({ user_id: userId }).first();
    const filingStatus = overrideProfile?.filing_status || profile?.filing_status || 'single';
    
    const standardDeductions: Record<string, number> = {
      'single': 15000,
      'married_joint': 30000,
      'married_separate': 15000,
      'head_household': 22500,
      'widow': 30000
    };
    const standardDeduction = standardDeductions[filingStatus] || 15000;

    // 6. Calculate Taxable Income (Base used for brackets)
    const taxableIncome = Math.max(0, totalTaxableGross - deduction401k - totalPreTaxDeductions - standardDeduction);

    // 7. Calculate Tax (Auto or Manual)
    let estimatedTax = 0;
    
    if (salaryProfile?.use_manual_tax && salaryProfile?.manual_tax_amount > 0) {
      estimatedTax = Number(salaryProfile.manual_tax_amount);
    } else {
      const brackets = await db('tax_brackets')
        .where({ filing_status: (filingStatus === 'widow' ? 'married_joint' : filingStatus === 'married_separate' ? 'single' : filingStatus), year })
        .orderBy('lower_bound', 'asc');

      if (brackets.length === 0) {
        estimatedTax = taxableIncome * 0.15; 
      } else {
        for (const bracket of brackets) {
          const lower = Number(bracket.lower_bound);
          const upper = bracket.upper_bound ? Number(bracket.upper_bound) : Infinity;
          const rate = Number(bracket.rate);
          const taxableInThisBracket = Math.min(Math.max(0, taxableIncome - lower), upper - lower);
          estimatedTax += taxableInThisBracket * rate;
        }
      }
    }

    // 8. Final Calculation
    const nonTaxableSources = await db('income_sources').where({ user_id: userId, is_taxed: false });
    const additionalNonTaxableIncome = nonTaxableSources.reduce((sum, src) => sum + (Number(src.amount) || 0), 0) * 12;
    
    // Non-pre-tax deductions (Post-tax)
    const postTaxDeductions = customDeductions
      .filter(d => !d.is_pre_tax)
      .reduce((sum, d) => sum + (Number(d.amount) * 12), 0);

    const totalActualGross = totalTaxableGross + additionalNonTaxableIncome;
    const netAnnualIncome = totalActualGross - deduction401k - totalPreTaxDeductions - estimatedTax - postTaxDeductions;

    return {
      year,
      filing_status: filingStatus,
      annual_salary: annualSalary,
      is_hourly: !!salaryProfile?.is_hourly,
      hourly_rate: Number(salaryProfile?.hourly_rate) || 0,
      hours_per_week: Number(salaryProfile?.hours_per_week) || 0,
      deduction_401k: deduction401k,
      total_pre_tax_deductions: totalPreTaxDeductions,
      total_post_tax_deductions: postTaxDeductions,
      total_gross: totalActualGross,
      taxable_income: taxableIncome,
      estimated_tax: estimatedTax,
      use_manual_tax: !!salaryProfile?.use_manual_tax,
      net_annual: netAnnualIncome,
      monthly_net: netAnnualIncome / 12,
      effective_rate: totalActualGross > 0 ? (estimatedTax / totalActualGross) : 0,
      last_calc: new Date().toISOString()
    };
  }

  static async seed2025Brackets() {
    const brackets = [
      { filing_status: 'single', lower_bound: 0, upper_bound: 11925, rate: 0.10, year: 2025, region: 'federal' },
      { filing_status: 'single', lower_bound: 11925, upper_bound: 48475, rate: 0.12, year: 2025, region: 'federal' },
      { filing_status: 'single', lower_bound: 48475, upper_bound: 103350, rate: 0.22, year: 2025, region: 'federal' },
      { filing_status: 'single', lower_bound: 103350, upper_bound: 197300, rate: 0.24, year: 2025, region: 'federal' },
      { filing_status: 'single', lower_bound: 197300, upper_bound: 250525, rate: 0.32, year: 2025, region: 'federal' },
      { filing_status: 'single', lower_bound: 250525, upper_bound: 626350, rate: 0.35, year: 2025, region: 'federal' },
      { filing_status: 'single', lower_bound: 626350, upper_bound: null, rate: 0.37, year: 2025, region: 'federal' },

      { filing_status: 'married_joint', lower_bound: 0, upper_bound: 23850, rate: 0.10, year: 2025, region: 'federal' },
      { filing_status: 'married_joint', lower_bound: 23850, upper_bound: 96950, rate: 0.12, year: 2025, region: 'federal' },
      { filing_status: 'married_joint', lower_bound: 96950, upper_bound: 206700, rate: 0.22, year: 2025, region: 'federal' },
      { filing_status: 'married_joint', lower_bound: 206700, upper_bound: 394600, rate: 0.24, year: 2025, region: 'federal' },
      { filing_status: 'married_joint', lower_bound: 394600, upper_bound: 501050, rate: 0.32, year: 2025, region: 'federal' },
      { filing_status: 'married_joint', lower_bound: 501050, upper_bound: 751600, rate: 0.35, year: 2025, region: 'federal' },
      { filing_status: 'married_joint', lower_bound: 751600, upper_bound: null, rate: 0.37, year: 2025, region: 'federal' },

      { filing_status: 'head_household', lower_bound: 0, upper_bound: 16950, rate: 0.10, year: 2025, region: 'federal' },
      { filing_status: 'head_household', lower_bound: 16950, upper_bound: 64650, rate: 0.12, year: 2025, region: 'federal' },
      { filing_status: 'head_household', lower_bound: 64650, upper_bound: 103350, rate: 0.22, year: 2025, region: 'federal' },
      { filing_status: 'head_household', lower_bound: 103350, upper_bound: 197300, rate: 0.24, year: 2025, region: 'federal' },
      { filing_status: 'head_household', lower_bound: 197300, upper_bound: 250500, rate: 0.32, year: 2025, region: 'federal' },
      { filing_status: 'head_household', lower_bound: 250500, upper_bound: 626350, rate: 0.35, year: 2025, region: 'federal' },
      { filing_status: 'head_household', lower_bound: 626350, upper_bound: null, rate: 0.37, year: 2025, region: 'federal' }
    ];

    for (const b of brackets) {
      const exists = await db('tax_brackets')
        .where({ filing_status: b.filing_status, lower_bound: b.lower_bound, year: b.year })
        .first();
      if (!exists) await db('tax_brackets').insert(b);
    }
  }
}
