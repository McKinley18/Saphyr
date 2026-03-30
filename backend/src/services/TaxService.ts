import db from '../database/db.js';

export class TaxService {
  static async calculateTaxEstimate(userId: string, year: number = 2025) {
    // 1. Get salary profile
    const salaryProfile = await db('salary_profiles').where({ user_id: userId }).first();
    const annualSalary = parseFloat(salaryProfile?.annual_salary || '0');
    const contribution401kPercent = parseFloat(salaryProfile?.contribution_401k_percent || '0') / 100;

    // 2. Get additional income sources that are TAXED
    const taxableSources = await db('income_sources')
      .where({ user_id: userId, is_taxed: true });
    
    const additionalTaxableIncome = taxableSources.reduce((sum, src) => sum + (parseFloat(src.amount || '0') * 12), 0);

    // 3. Get individual transactions marked as taxable income
    const incomeResult = await db('transactions')
      .where({ user_id: userId, type: 'income', is_taxable: true })
      .andWhereRaw('EXTRACT(YEAR FROM date) = ?', [year])
      .sum('amount as total_income')
      .first();

    const otherIncome = parseFloat(incomeResult?.total_income || '0') + additionalTaxableIncome;
    
    // 4. Calculate 401k deduction (Pre-tax)
    const deduction401k = annualSalary * contribution401kPercent;
    const totalGrossIncome = annualSalary + otherIncome;

    // 5. Get user tax profile (filing status)
    const profile = await db('tax_profiles').where({ user_id: userId }).first();
    const filingStatus = profile?.filing_status || 'single';
    
    const standardDeductions: Record<string, number> = {
      'single': 15000,
      'married_joint': 30000,
      'married_separate': 15000,
      'head_household': 22500,
      'widow': 30000
    };
    const standardDeduction = standardDeductions[filingStatus] || 15000;

    // 6. Calculate Taxable Income
    const taxableIncome = Math.max(0, totalGrossIncome - deduction401k - standardDeduction);

    // 7. Get brackets
    const brackets = await db('tax_brackets')
      .where({ filing_status: (filingStatus === 'widow' ? 'married_joint' : filingStatus === 'married_separate' ? 'single' : filingStatus), year })
      .orderBy('lower_bound', 'asc');

    // 8. Calculate Tax
    let estimatedTax = 0;
    if (brackets.length === 0) {
      estimatedTax = taxableIncome * 0.15; // Fallback
    } else {
      for (const bracket of brackets) {
        const lower = parseFloat(bracket.lower_bound);
        const upper = bracket.upper_bound ? parseFloat(bracket.upper_bound) : Infinity;
        const rate = parseFloat(bracket.rate);

        const taxableInThisBracket = Math.min(Math.max(0, taxableIncome - lower), upper - lower);
        estimatedTax += taxableInThisBracket * rate;
      }
    }

    const netAnnualIncome = totalGrossIncome - deduction401k - estimatedTax;

    return {
      year,
      filing_status: filingStatus,
      annual_salary: annualSalary,
      deduction_401k: deduction401k,
      other_income: otherIncome,
      total_gross: totalGrossIncome,
      taxable_income: taxableIncome,
      standard_deduction: standardDeduction,
      estimated_tax: estimatedTax,
      net_annual: netAnnualIncome,
      monthly_net: netAnnualIncome / 12,
      effective_rate: totalGrossIncome > 0 ? (estimatedTax / totalGrossIncome) : 0
    };
  }

  static async seed2025Brackets() {
    // Note: Widow/Widower uses Married Joint brackets. Separate uses Single brackets.
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
