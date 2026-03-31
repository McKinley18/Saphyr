import React, { useState } from 'react';

interface BillSimulatorProps {
  bills: any[];
}

const BillSimulator: React.FC<BillSimulatorProps> = ({ bills }) => {
  const [selectedBillId, setSelectedBillId] = useState<string>('');
  const [extraPayment, setExtraPayment] = useState<string>('');

  const safeFormat = (val: any) => {
    const num = parseFloat(val || '0');
    return isNaN(num) ? '0.00' : num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const selectedBill = bills.find(b => b.id === selectedBillId);
  const paymentValue = parseFloat(extraPayment) || 0;

  // Monthly Payment Calculation (Standard Amortization)
  // P = (Pv * r) / (1 - (1 + r)^-n)
  const calculateMonthlyPayment = (principal: number, annualApr: number, months: number) => {
    if (annualApr === 0) return principal / months;
    const r = annualApr / 12;
    return (principal * r) / (1 - Math.pow(1 + r, -months));
  };

  // Calculate Remaining Term after extra payment
  // n = -log(1 - (Pv * r) / P) / log(1 + r)
  const calculateRemainingTerm = (principal: number, annualApr: number, monthlyPayment: number) => {
    if (annualApr === 0) return principal / monthlyPayment;
    const r = annualApr / 12;
    const val = 1 - (principal * r) / monthlyPayment;
    if (val <= 0) return 0; // Already paid off or payment too low
    return -Math.log(val) / Math.log(1 + r);
  };

  let stats = null;
  if (selectedBill && selectedBill.apr > 0 && selectedBill.loan_term > 0) {
    const principal = Math.abs(parseFloat(selectedBill.balance));
    const apr = parseFloat(selectedBill.apr);
    const originalTerm = parseInt(selectedBill.loan_term);
    
    const standardPayment = calculateMonthlyPayment(principal, apr, originalTerm);
    const newPrincipal = Math.max(0, principal - paymentValue);
    
    // If they make an extra payment now, and keep paying the SAME monthly amount
    const newTerm = calculateRemainingTerm(newPrincipal, apr, standardPayment);
    const monthsSaved = originalTerm - (newTerm + (paymentValue > 0 ? 0 : 0)); // simplified
    
    // Total Interest Cost = (Payment * Months) - Principal
    const originalTotalInterest = (standardPayment * originalTerm) - principal;
    const newTotalInterest = (standardPayment * newTerm) - newPrincipal;
    const totalInterestSaved = originalTotalInterest - newTotalInterest;

    stats = {
      standardPayment,
      newPrincipal,
      newTerm: Math.ceil(newTerm),
      monthsSaved: Math.max(0, Math.floor(originalTerm - newTerm)),
      totalInterestSaved: Math.max(0, totalInterestSaved)
    };
  }

  return (
    <div className="card" style={{ borderLeft: '5px solid var(--warning)', background: 'rgba(245, 158, 11, 0.02)' }}>
      <h3 style={{ color: 'var(--warning)', margin: '0 0 10px 0', fontSize: '1.1rem', fontWeight: 800 }}>PRO LOAN SIMULATOR</h3>
      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '20px' }}>
        Select a loan to see how extra principal payments shorten your term and save interest.
      </p>

      <div className="form-group">
        <label>Select Loan/Debt</label>
        <select value={selectedBillId} onChange={e => setSelectedBillId(e.target.value)}>
          <option value="">-- Choose Account --</option>
          {bills.map(b => (
            <option key={b.id} value={b.id}>{b.name} (${safeFormat(b.balance)})</option>
          ))}
        </select>
      </div>

      {selectedBill && (
        <>
          {!selectedBill.apr || !selectedBill.loan_term ? (
            <div style={{ padding: '15px', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', fontSize: '0.75rem', color: 'var(--warning)', textAlign: 'center' }}>
              • Update this bill with an **APR** and **Loan Term** to enable advanced simulations.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginTop: '10px' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Extra Principal Payment ($)</label>
                <input 
                  type="number" 
                  placeholder="0.00" 
                  value={extraPayment} 
                  onChange={e => setExtraPayment(e.target.value)}
                  style={{ fontSize: '1.25rem', fontWeight: 900, color: 'var(--warning)', border: '2px solid var(--warning)' }}
                />
              </div>

              {stats && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Estimated Monthly Payment:</span>
                    <span style={{ fontWeight: 800 }}>${safeFormat(stats.standardPayment)}</span>
                  </div>

                  <div style={{ padding: '20px', background: 'var(--bg)', borderRadius: '16px', border: '1px solid var(--warning)', display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--warning)', letterSpacing: '0.1em' }}>IMPACT SUMMARY</div>
                    </div>
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ fontSize: '0.75rem', fontWeight: 700 }}>Time Saved:</div>
                      <div style={{ fontSize: '1.1rem', fontWeight: 900, color: 'var(--success)' }}>{stats.monthsSaved} Months Sooner</div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ fontSize: '0.75rem', fontWeight: 700 }}>Interest Saved:</div>
                      <div style={{ fontSize: '1.1rem', fontWeight: 900, color: 'var(--success)' }}>+${safeFormat(stats.totalInterestSaved)}</div>
                    </div>

                    <div style={{ borderTop: '1px solid var(--border)', paddingTop: '10px', marginTop: '5px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                        <span style={{ color: 'var(--text-muted)' }}>New Remaining Term:</span>
                        <span style={{ fontWeight: 800 }}>{stats.newTerm} Months</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default BillSimulator;
