import React, { useState } from 'react';

interface BillSimulatorProps {
  bills: any[];
  customColor?: string;
  renderColorPicker?: () => React.ReactNode;
}

const BillSimulator: React.FC<BillSimulatorProps> = ({ bills, customColor, renderColorPicker }) => {
  const [selectedBillId, setSelectedBillId] = useState<string>('');
  const [extraPayment, setExtraPayment] = useState<string>('');

  const safeFormat = (val: any) => {
    const num = parseFloat(val || '0');
    return isNaN(num) ? '0.00' : num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const selectedBill = bills.find(b => b.id === selectedBillId);
  const paymentValue = parseFloat(extraPayment) || 0;

  const calculateMonthlyPayment = (principal: number, annualApr: number, months: number) => {
    if (annualApr === 0) return principal / months;
    const r = annualApr / 12;
    return (principal * r) / (1 - Math.pow(1 + r, -months));
  };

  const calculateRemainingTerm = (principal: number, annualApr: number, monthlyPayment: number) => {
    if (annualApr === 0) return principal / monthlyPayment;
    const r = annualApr / 12;
    const val = 1 - (principal * r) / monthlyPayment;
    if (val <= 0) return 0;
    return -Math.log(val) / Math.log(1 + r);
  };

  let stats = null;
  if (selectedBill && selectedBill.apr > 0 && selectedBill.loan_term > 0) {
    const principal = Math.abs(parseFloat(selectedBill.balance));
    const apr = parseFloat(selectedBill.apr);
    const originalTerm = parseInt(selectedBill.loan_term);
    const standardPayment = calculateMonthlyPayment(principal, apr, originalTerm);
    const newPrincipal = Math.max(0, principal - paymentValue);
    const newTerm = calculateRemainingTerm(newPrincipal, apr, standardPayment);
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

  const accent = customColor || 'var(--primary)';

  return (
    <div className="card" style={{ borderLeft: `5px solid ${accent}`, background: 'var(--subtle-overlay)', padding: '35px', position: 'relative' }}>
      {renderColorPicker && renderColorPicker()}
      <h3 style={{ color: 'var(--text)', margin: '0 0 10px 0', fontSize: '1.1rem', fontWeight: 900, textAlign: 'center' }}>LOAN SIMULATOR</h3>
      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '25px', textAlign: 'center' }}>
        Analyze the impact of extra principal payments on your term and interest costs.
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
            <div style={{ padding: '20px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', fontSize: '0.75rem', color: 'var(--warning)', textAlign: 'center', border: '1px dashed var(--warning)' }}>
              • Update this obligation with an **APR** and **Loan Term** to enable simulations.
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
                  style={{ fontSize: '1.25rem', fontWeight: 900, color: accent, border: `2px solid ${accent}` }}
                />
              </div>

              {stats && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                    <span style={{ color: 'var(--text-muted)', fontWeight: 700 }}>Estimated Monthly Payment:</span>
                    <span style={{ fontWeight: 900, fontFamily: 'JetBrains Mono, monospace' }}>${safeFormat(stats.standardPayment)}</span>
                  </div>

                  <div style={{ padding: '25px', background: 'var(--bg)', borderRadius: '20px', border: `2px solid ${accent}`, display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '0.7rem', fontWeight: 900, color: accent, letterSpacing: '0.1em' }}>SIMULATION IMPACT</div>
                    </div>
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ fontSize: '0.8rem', fontWeight: 800 }}>Months Saved:</div>
                      <div style={{ fontSize: '1.2rem', fontWeight: 900, color: 'var(--success)' }}>{stats.monthsSaved} Months</div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ fontSize: '0.8rem', fontWeight: 800 }}>Interest Saved:</div>
                      <div style={{ fontSize: '1.2rem', fontWeight: 900, color: 'var(--success)', fontFamily: 'JetBrains Mono, monospace' }}>+${safeFormat(stats.totalInterestSaved)}</div>
                    </div>

                    <div style={{ borderTop: '1px solid var(--border)', paddingTop: '15px', marginTop: '5px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                        <span style={{ color: 'var(--text-muted)', fontWeight: 700 }}>New Remaining Term:</span>
                        <span style={{ fontWeight: 900 }}>{stats.newTerm} Months</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
      
      <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', textAlign: 'center', fontStyle: 'italic', marginTop: '20px' }}>
        *Disclaimer: Results are estimates based on user-provided APR and balances. Actual payoff may vary based on lender calculation methods.
      </div>
    </div>
  );
};

export default BillSimulator;
