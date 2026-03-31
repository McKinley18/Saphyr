import React, { useState, useEffect } from 'react';
import UserGuide from '../../components/UserGuide/UserGuide';
import { 
  createIncomeSource, 
  deleteIncomeSource,
  addDeduction,
  deleteDeduction
} from '../../services/api';

interface IncomePageProps {
  userId: string;
  savedSalary: any; 
  taxEstimate: any;
  incomeSources: any[];
  handleSalarySubmit: (e: any, status: string, extraData?: any) => void;
  loadData: () => void;
}

const IncomePage: React.FC<IncomePageProps> = ({ 
  userId, savedSalary, taxEstimate, incomeSources, handleSalarySubmit, loadData
}) => {
  const [localFilingStatus, setLocalFilingStatus] = useState(savedSalary?.filing_status || 'single');
  const [isHourly, setIsHourly] = useState(savedSalary?.is_hourly || false);
  const [hourlyRate, setHourlyRate] = useState(savedSalary?.hourly_rate || 0);
  const [hoursPerWeek, setHoursPerWeek] = useState(savedSalary?.hours_per_week || 40);
  const [annualGross, setAnnualGross] = useState(savedSalary?.annual_salary || 0);
  const [pct401k, setPct401k] = useState(savedSalary?.['401k_percent'] || 0);
  
  const [useManualTax, setUseManualTax] = useState(savedSalary?.use_manual_tax || false);
  const [manualTaxAmount, setManualTaxAmount] = useState(savedSalary?.manual_tax_amount || 0);

  const [newDeduction, setNewDeduction] = useState({ name: '', amount: '', is_pre_tax: true });
  const [newSource, setNewSource] = useState({ name: '', amount: '', is_taxed: false });

  useEffect(() => {
    if (savedSalary) {
      setLocalFilingStatus(savedSalary.filing_status || 'single');
      setIsHourly(savedSalary.is_hourly || false);
      setHourlyRate(savedSalary.hourly_rate || 0);
      setHoursPerWeek(savedSalary.hours_per_week || 40);
      setAnnualGross(savedSalary.annual_salary || 0);
      setPct401k(savedSalary['401k_percent'] || 0);
      setUseManualTax(savedSalary.use_manual_tax || false);
      setManualTaxAmount(savedSalary.manual_tax_amount || 0);
    }
  }, [savedSalary]);

  const safeFormat = (val: any) => {
    const num = parseFloat(val || '0');
    return isNaN(num) ? '0.00' : num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const onSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      is_hourly: isHourly,
      hourly_rate: hourlyRate,
      hours_per_week: hoursPerWeek,
      annual_salary: isHourly ? (hourlyRate * hoursPerWeek * 52) : annualGross,
      contribution_401k_percent: pct401k,
      use_manual_tax: useManualTax,
      manual_tax_amount: manualTaxAmount
    };
    (handleSalarySubmit as any)(e, localFilingStatus, payload);
    // Clear local inputs after submission to show placeholders
    if (!isHourly) setAnnualGross(0);
    setPct401k(0);
  };

  const onAddDeduction = async (e: React.FormEvent) => {
    e.preventDefault();
    await addDeduction(newDeduction);
    setNewDeduction({ name: '', amount: '', is_pre_tax: true });
    loadData();
  };

  const onAddSource = async (e: React.FormEvent) => {
    e.preventDefault();
    await createIncomeSource({ ...newSource, user_id: userId });
    setNewSource({ name: '', amount: '', is_taxed: false });
    loadData();
  };

  return (
    <div className="income-page" style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '25px' }}>
      <UserGuide guideKey="income_v4" title="Income Architect">
        <p>Build your monthly net income step-by-step. Start with your gross earnings, add deductions, and verify your taxes.</p>
      </UserGuide>

      <div className="grid" style={{ gridTemplateColumns: '1fr 1fr 1fr', gap: '25px', alignItems: 'start' }}>
        
        {/* STEP 1: EARNINGS */}
        <section className="card" style={{ borderLeft: '5px solid var(--primary)' }}>
          <div style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--primary)', marginBottom: '5px' }}>STEP 1</div>
          <h3 style={{ margin: '0 0 20px 0', fontSize: '1.1rem', fontWeight: 900 }}>BASE EARNINGS</h3>
          
          <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
            <button 
              onClick={() => setIsHourly(false)}
              style={{ flex: 1, fontSize: '0.7rem', background: !isHourly ? 'var(--primary)' : 'rgba(255,255,255,0.05)', color: !isHourly ? 'white' : 'var(--text)', border: '1px solid var(--border)' }}
            >SALARY</button>
            <button 
              onClick={() => setIsHourly(true)}
              style={{ flex: 1, fontSize: '0.7rem', background: isHourly ? 'var(--primary)' : 'rgba(255,255,255,0.05)', color: isHourly ? 'white' : 'var(--text)', border: '1px solid var(--border)' }}
            >HOURLY</button>
          </div>

          <form onSubmit={onSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            {isHourly ? (
              <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div className="form-group">
                  <label>Hourly Rate ($)</label>
                  <input type="number" step="0.01" value={hourlyRate} onChange={e => setHourlyRate(parseFloat(e.target.value) || 0)} />
                </div>
                <div className="form-group">
                  <label>Hours / Week</label>
                  <input type="number" value={hoursPerWeek} onChange={e => setHoursPerWeek(parseInt(e.target.value) || 0)} />
                </div>
              </div>
            ) : (
              <div className="form-group">
                <label>Annual Gross Salary ($)</label>
                <input type="number" value={annualGross} onChange={e => setAnnualGross(parseFloat(e.target.value) || 0)} />
              </div>
            )}

            <div className="form-group">
              <label>Filing Status</label>
              <select value={localFilingStatus} onChange={e => setLocalFilingStatus(e.target.value)}>
                <option value="single">Single</option>
                <option value="married_joint">Married Filing Jointly</option>
                <option value="married_separate">Married Filing Separately</option>
                <option value="head_household">Head of Household</option>
                <option value="widow">Qualifying Surviving Spouse</option>
              </select>
            </div>

            <div style={{ padding: '15px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                <span>Estimated Annual:</span>
                <strong style={{ color: 'var(--text)' }}>${safeFormat(isHourly ? hourlyRate * hoursPerWeek * 52 : annualGross)}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '5px' }}>
                <span>Estimated Monthly:</span>
                <strong style={{ color: 'var(--text)' }}>${safeFormat((isHourly ? hourlyRate * hoursPerWeek * 52 : annualGross) / 12)}</strong>
              </div>
            </div>

            <button type="submit" style={{ background: 'var(--primary)', fontWeight: 800 }}>SYNC EARNINGS</button>
          </form>
        </section>

        {/* STEP 2: DEDUCTIONS */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
          <section className="card" style={{ borderLeft: '5px solid var(--warning)' }}>
            <div style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--warning)', marginBottom: '5px' }}>STEP 2</div>
            <h3 style={{ margin: '0 0 20px 0', fontSize: '1.1rem', fontWeight: 900 }}>DEDUCTIONS</h3>
            
            <div className="form-group" style={{ marginBottom: '20px' }}>
              <label>401k Contribution (%)</label>
              <div style={{ display: 'flex', gap: '10px' }}>
                <input type="number" value={pct401k} onChange={e => setPct401k(parseFloat(e.target.value) || 0)} />
                <button onClick={onSaveProfile} style={{ width: 'auto', background: 'var(--warning)', color: 'black' }}>SET</button>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
              {(savedSalary?.custom_deductions || []).map((d: any) => (
                <div key={d.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                  <span style={{ fontSize: '0.85rem' }}>{d.name}</span>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <span style={{ fontWeight: 700, color: 'var(--danger)' }}>-${safeFormat(d.amount)}</span>
                    <button onClick={async () => { await deleteDeduction(d.id); loadData(); }} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '1.2rem', padding: 0, width: 'auto', marginTop: 0, boxShadow: 'none' }}>&times;</button>
                  </div>
                </div>
              ))}
            </div>

            <form onSubmit={onAddDeduction} style={{ padding: '15px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px' }}>
              <div className="form-group"><label style={{ fontSize: '0.7rem' }}>New Deduction (Health, HSA, etc)</label><input placeholder="Name" value={newDeduction.name} onChange={e => setNewDeduction({...newDeduction, name: e.target.value})} /></div>
              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <input type="number" placeholder="Monthly $" value={newDeduction.amount} onChange={e => setNewDeduction({...newDeduction, amount: e.target.value})} />
                <button type="submit" style={{ width: 'auto', background: 'rgba(255,255,255,0.1)' }}>ADD</button>
              </div>
            </form>
          </section>

          <section className="card" style={{ borderLeft: '5px solid var(--success)' }}>
            <div style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--success)', marginBottom: '5px' }}>STEP 3</div>
            <h3 style={{ margin: '0 0 20px 0', fontSize: '1.1rem', fontWeight: 900 }}>OTHER INCOME</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '15px' }}>
              {(incomeSources || []).map(src => (
                <div key={src.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                  <span style={{ fontSize: '0.85rem' }}>{src.name} {src.is_taxed && <small style={{ color: 'var(--warning)' }}>(Taxed)</small>}</span>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <span style={{ fontWeight: 700, color: 'var(--success)' }}>+${safeFormat(src.amount)}</span>
                    <button onClick={async () => { await deleteIncomeSource(src.id); loadData(); }} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '1.2rem', padding: 0, width: 'auto', marginTop: 0, boxShadow: 'none' }}>&times;</button>
                  </div>
                </div>
              ))}
            </div>
            <form onSubmit={onAddSource} style={{ padding: '15px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px' }}>
              <input style={{ marginBottom: '10px' }} placeholder="Source Name" value={newSource.name} onChange={e => setNewSource({...newSource, name: e.target.value})} />
              <div style={{ display: 'flex', gap: '10px' }}>
                <input type="number" placeholder="Monthly $" value={newSource.amount} onChange={e => setNewSource({...newSource, amount: e.target.value})} />
                <button type="submit" style={{ width: 'auto', background: 'var(--success)', color: 'black' }}>ADD</button>
              </div>
            </form>
          </section>
        </div>

        {/* STEP 3: TAX & SUMMARY */}
        <section className="card" style={{ background: 'var(--card)', border: '2px solid var(--border)', position: 'sticky', top: '100px' }}>
          <div style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', marginBottom: '5px', textAlign: 'center' }}>FINAL ASSESSMENT</div>
          <h3 style={{ margin: '0 0 25px 0', fontSize: '1.1rem', fontWeight: 900, textAlign: 'center' }}>NET TAKE-HOME</h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>Monthly Gross</span>
              <span className="currency">${safeFormat(taxEstimate?.annual_salary / 12)}</span>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
              <span style={{ color: 'var(--danger)' }}>401k + Deductions</span>
              <span className="currency">-${safeFormat((taxEstimate?.deduction_401k + taxEstimate?.total_pre_tax_deductions) / 12)}</span>
            </div>

            <div style={{ padding: '15px', background: 'rgba(244, 63, 94, 0.05)', borderRadius: '12px', border: '1px solid rgba(244, 63, 94, 0.2)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--danger)' }}>FEDERAL INCOME TAX</span>
                <button 
                  onClick={() => { setUseManualTax(!useManualTax); onSaveProfile(new Event('submit') as any); }}
                  style={{ width: 'auto', padding: '4px 8px', fontSize: '0.6rem', background: useManualTax ? 'var(--primary)' : 'rgba(255,255,255,0.1)' }}
                >
                  {useManualTax ? 'MANUAL ON' : 'AUTO-ESTIMATE'}
                </button>
              </div>
              
              {useManualTax ? (
                <div style={{ display: 'flex', gap: '10px' }}>
                  <input 
                    type="number" 
                    value={manualTaxAmount} 
                    onChange={e => setManualTaxAmount(parseFloat(e.target.value) || 0)}
                    style={{ fontSize: '1.1rem', fontWeight: 900, color: 'var(--danger)' }}
                  />
                  <button onClick={onSaveProfile} style={{ width: 'auto', background: 'var(--danger)' }}>OK</button>
                </div>
              ) : (
                <div style={{ fontSize: '1.2rem', fontWeight: 900, color: 'var(--danger)' }} className="currency">
                  -${safeFormat(taxEstimate?.estimated_tax / 12)}
                </div>
              )}
              <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', marginTop: '5px' }}>
                {useManualTax ? '*Using user-provided monthly tax.' : `*Effective rate: ${((taxEstimate?.effective_rate || 0) * 100).toFixed(2)}%`}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', color: 'var(--success)' }}>
              <span>Other Income</span>
              <span className="currency">+${safeFormat(incomeSources.reduce((sum, s) => sum + parseFloat(s.amount), 0))}</span>
            </div>

            <div style={{ marginTop: '15px', padding: '20px 10px', background: 'var(--bg)', borderRadius: '16px', border: '2px solid var(--primary)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px' }}>
              <div style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--primary)', letterSpacing: '0.15em' }}>VERIFIED MONTHLY NET</div>
              <div style={{ fontSize: '2.4rem', fontWeight: 900 }} className="currency positive">
                ${safeFormat(taxEstimate?.monthly_net + incomeSources.reduce((sum, s) => sum + parseFloat(s.amount), 0))}
              </div>
            </div>
          </div>
        </section>

      </div>

      <style>{`
        .income-page input, .income-page select { background: rgba(255,255,255,0.05); border: 1px solid var(--border); padding: 12px; border-radius: 8px; color: var(--text); width: 100%; }
        .income-page label { font-size: 0.75rem; font-weight: 700; color: var(--text-muted); margin-bottom: 8px; display: block; text-transform: uppercase; }
        @media (max-width: 1024px) {
          .income-page .grid { grid-template-columns: 1fr !important; }
          .income-page section { position: static !important; }
        }
      `}</style>
    </div>
  );
};

export default IncomePage;
