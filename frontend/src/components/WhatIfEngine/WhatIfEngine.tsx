import React, { useState } from 'react';

interface WhatIfEngineProps {
  currentCash: number;
  currentRunway: number;
  currentDebt: number;
  monthlyNetIncome: number;
  monthlyFixedObligations: number;
  onClose: () => void;
}

const WhatIfEngine: React.FC<WhatIfEngineProps> = ({ currentCash, currentRunway, currentDebt, monthlyNetIncome, monthlyFixedObligations, onClose }) => {
  const [purchaseAmount, setPurchaseAmount] = useState<string>('');
  const [downPayment, setDownPayment] = useState<string>('');
  const [apr, setApr] = useState<string>('');
  const [termMonths, setTermMonths] = useState<string>('');
  const [extraMonthlyExpense, setExtraMonthlyExpense] = useState<string>('');

  const safeFormat = (num: number) => num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  // Calculate Scenario Impact
  const pAmount = parseFloat(purchaseAmount || '0');
  const dPayment = parseFloat(downPayment || '0');
  const rApr = parseFloat(apr || '0') / 100 / 12;
  const nTerm = parseFloat(termMonths || '1');
  const extraExp = parseFloat(extraMonthlyExpense || '0');

  const principal = Math.max(0, pAmount - dPayment);
  let newMonthlyPayment = 0;

  if (principal > 0) {
    if (rApr > 0 && nTerm > 0) {
      newMonthlyPayment = principal * (rApr * Math.pow(1 + rApr, nTerm)) / (Math.pow(1 + rApr, nTerm) - 1);
    } else if (nTerm > 0) {
      newMonthlyPayment = principal / nTerm;
    }
  }

  const totalNewMonthlyCost = newMonthlyPayment + extraExp;
  const newRunway = currentRunway - totalNewMonthlyCost;
  const newCash = currentCash - dPayment;
  const newDebt = currentDebt + principal;

  // DTI Calculation
  const currentDTI = monthlyNetIncome > 0 ? (monthlyFixedObligations / monthlyNetIncome) * 100 : 0;
  const newDTI = monthlyNetIncome > 0 ? ((monthlyFixedObligations + totalNewMonthlyCost) / monthlyNetIncome) * 100 : 0;

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', animation: 'pageEnter 0.3s ease' }}>
      <div className="card glow-saphyr" style={{ background: 'var(--card)', padding: '30px', width: '100%', maxWidth: '800px', maxHeight: '90vh', overflowY: 'auto', borderRadius: '16px', position: 'relative' }}>
        <button onClick={onClose} style={{ position: 'absolute', top: '20px', right: '20px', background: 'none', border: 'none', fontSize: '1.5rem', color: 'var(--text-muted)', cursor: 'pointer', padding: 0 }}>&times;</button>
        <h2 style={{ margin: '0 0 20px 0', fontSize: '1.5rem', fontWeight: 900, textAlign: 'center' }}>WHAT-IF ENGINE <span style={{ color: 'var(--primary)', fontSize: '0.8rem', verticalAlign: 'middle', marginLeft: '10px' }}>[SANDBOX]</span></h2>
        
        <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '30px' }}>Simulate a major purchase (e.g. Car, Home) to instantly see the impact on your monthly remaining capital, liquidity, and DTI ratio before committing.</p>

        <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '30px' }}>
          {/* INPUTS */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 800, margin: 0, borderBottom: '1px solid var(--border)', paddingBottom: '10px' }}>SCENARIO VARIABLES</h3>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Purchase Amount</label>
              <div className="currency-input-wrapper">
                <span className="currency-prefix">$</span>
                <input type="number" placeholder="25000" value={purchaseAmount} onChange={e => setPurchaseAmount(e.target.value)} />
              </div>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Down Payment</label>
              <div className="currency-input-wrapper">
                <span className="currency-prefix">$</span>
                <input type="number" placeholder="5000" value={downPayment} onChange={e => setDownPayment(e.target.value)} />
              </div>
            </div>
            <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
              <div className="form-group" style={{ marginBottom: 0 }}><label>APR (%)</label><input type="number" placeholder="5.5" value={apr} onChange={e => setApr(e.target.value)} /></div>
              <div className="form-group" style={{ marginBottom: 0 }}><label>Term (Months)</label><input type="number" placeholder="60" value={termMonths} onChange={e => setTermMonths(e.target.value)} /></div>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Extra Monthly Cost (Insurance, Gas)</label>
              <div className="currency-input-wrapper">
                <span className="currency-prefix">$</span>
                <input type="number" placeholder="150" value={extraMonthlyExpense} onChange={e => setExtraMonthlyExpense(e.target.value)} />
              </div>
            </div>
          </div>

          {/* OUTPUTS */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 800, margin: 0, borderBottom: '1px solid var(--border)', paddingBottom: '10px', color: 'var(--primary)' }}>PROJECTED IMPACT</h3>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '15px', background: 'var(--subtle-overlay)', borderRadius: '12px', border: '1px solid var(--border)' }}>
              <span style={{ fontWeight: 800, fontSize: '0.85rem', color: 'var(--text-muted)' }}>New Monthly Payment</span>
              <span className="currency negative" style={{ fontWeight: 900 }}>-${safeFormat(totalNewMonthlyCost)}/mo</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '15px', background: 'var(--subtle-overlay)', borderRadius: '12px', border: '1px solid var(--border)' }}>
              <span style={{ fontWeight: 800, fontSize: '0.85rem', color: 'var(--text-muted)' }}>New Monthly Remaining</span>
              <span className={`currency ${newRunway >= 0 ? 'positive' : 'negative'}`} style={{ fontWeight: 900 }}>${safeFormat(newRunway)}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '15px', background: 'var(--subtle-overlay)', borderRadius: '12px', border: '1px solid var(--border)' }}>
              <span style={{ fontWeight: 800, fontSize: '0.85rem', color: 'var(--text-muted)' }}>Available Liquidity</span>
              <div style={{ textAlign: 'right' }}>
                <span className={`currency ${newCash >= 0 ? 'positive' : 'negative'}`} style={{ fontWeight: 900, display: 'block' }}>${safeFormat(newCash)}</span>
                {dPayment > 0 && <span style={{ fontSize: '0.65rem', color: 'var(--danger)' }}>(-${safeFormat(dPayment)} Down)</span>}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '15px', background: 'var(--subtle-overlay)', borderRadius: '12px', border: '1px solid var(--border)' }}>
              <span style={{ fontWeight: 800, fontSize: '0.85rem', color: 'var(--text-muted)' }}>Debt-to-Income (DTI) Ratio</span>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontWeight: 900, color: newDTI > 36 ? 'var(--danger)' : (newDTI > 28 ? 'var(--warning)' : 'var(--success)'), display: 'block' }}>{newDTI.toFixed(1)}%</span>
                <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Was {currentDTI.toFixed(1)}%</span>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '15px', background: 'var(--subtle-overlay)', borderRadius: '12px', border: '1px solid var(--border)' }}>
              <span style={{ fontWeight: 800, fontSize: '0.85rem', color: 'var(--text-muted)' }}>Total Fixed Obligations</span>
              <div style={{ textAlign: 'right' }}>
                <span className="currency negative" style={{ fontWeight: 900, display: 'block' }}>-${safeFormat(newDebt)}</span>
                <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Was -${safeFormat(currentDebt)}</span>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default WhatIfEngine;