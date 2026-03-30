import React, { useState, useEffect } from 'react';
import UserGuide from '../../components/UserGuide/UserGuide';
import TaxEstimator from '../../components/TaxEstimator/TaxEstimator';
import { createIncomeSource, deleteIncomeSource, fetchTaxProfile, updateTaxProfile, seedTaxBrackets } from '../../services/api';

interface IncomePageProps {
  userId: string;
  salary: any;
  setSalary: (s: any) => void;
  taxEstimate: any;
  accounts: any[];
  incomeSources: any[];
  handleSalarySubmit: (e: any) => void;
  loadData: () => void;
}

const IncomePage: React.FC<IncomePageProps> = ({ 
  userId, 
  salary, 
  setSalary, 
  taxEstimate, 
  accounts, 
  incomeSources,
  handleSalarySubmit,
  loadData
}) => {
  const [showAddSource, setShowAddSource] = useState(false);
  const [newSource, setNewSource] = useState({ name: '', amount: '', account_id: '' });
  const [taxProfile, setTaxProfile] = useState({ filing_status: 'single' });

  useEffect(() => {
    const loadProfile = async () => {
      await seedTaxBrackets();
      const profile = await fetchTaxProfile();
      if (profile) setTaxProfile(profile);
    };
    loadProfile();
  }, [userId]);

  const safeFormat = (val: any) => {
    const num = parseFloat(val || '0');
    return isNaN(num) ? '0.00' : num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const baseMonthlyNet = parseFloat(taxEstimate?.monthly_net || '0');
  const totalAdditionalMonthly = (incomeSources || []).reduce((sum, src) => sum + parseFloat(src.amount || '0'), 0);
  const totalMonthlyNet = baseMonthlyNet + totalAdditionalMonthly;

  const handleCreateSource = async (e: React.FormEvent) => {
    e.preventDefault();
    await createIncomeSource({
      user_id: userId,
      name: newSource.name,
      amount: parseFloat(newSource.amount),
      account_id: newSource.account_id || null
    });
    setNewSource({ name: '', amount: '', account_id: '' });
    setShowAddSource(false);
    loadData();
  };

  const handleDeleteSource = async (id: string, name: string) => {
    if (window.confirm(`Remove income source "${name}"?`)) {
      await deleteIncomeSource(id);
      loadData();
    }
  };

  const handleStatusChange = async (status: string) => {
    await updateTaxProfile({ user_id: userId, filing_status: status });
    setTaxProfile({ filing_status: status });
    loadData();
  };

  const cashAccounts = (accounts || []).filter(acc => 
    acc && (['Checking', 'Savings', 'Cash Accounts'].includes(acc.type) || acc.group_name === 'Cash Accounts')
  );

  return (
    <div className="income-page" style={{ maxWidth: '900px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <UserGuide guideKey="income" title="Income">
        <p>This tab is where you define your total monthly cash inflow. Accuracy here is key for your overall budget.</p>
        <ul style={{ paddingLeft: '20px', marginTop: '10px' }}>
          <li><strong>Primary Salary:</strong> Enter your annual gross pay and 401k percentage. We use official 2025 tax brackets to calculate your estimated take-home pay.</li>
          <li><strong>Filing Status:</strong> Choose your tax filing status. This significantly impacts your tax liability and monthly net pay.</li>
          <li><strong>Additional Income:</strong> Add side-gigs, rental income, or other recurring deposits here.</li>
          <li><strong>Net Take-Home:</strong> The final number at the bottom is what fuels your monthly budget.</li>
        </ul>
      </UserGuide>

      <h2 style={{ margin: 0 }}>Income Management</h2>
      
      {/* 1. Primary Annual Salary */}
      <div className="card" style={{ borderLeft: '5px solid var(--primary)' }}>
        <h3 style={{ margin: '0 0 10px 0', color: 'var(--primary)', fontSize: '1.1rem' }}>1. Primary Annual Salary</h3>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '20px' }}>Set your gross income and filing status for 2025.</p>
        
        <div style={{ marginBottom: '25px', display: 'grid', gridTemplateColumns: '1fr', gap: '20px' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Tax Filing Status</label>
            <select value={taxProfile.filing_status} onChange={e => handleStatusChange(e.target.value)}>
              <option value="single">Single</option>
              <option value="married_joint">Married Filing Jointly</option>
              <option value="head_household">Head of Household</option>
            </select>
          </div>
        </div>

        <form onSubmit={handleSalarySubmit} className="grid" style={{ gridTemplateColumns: '1fr 1fr auto', gap: '20px', alignItems: 'flex-end', borderTop: '1px solid var(--border)', paddingTop: '25px' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Annual Gross ($)</label>
            <input 
              type="number" 
              value={salary?.annual_salary === 0 ? '' : salary?.annual_salary} 
              placeholder="0"
              onChange={e => setSalary({...salary, annual_salary: e.target.value === '' ? 0 : parseFloat(e.target.value)})} 
            />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>401k Contribution (%)</label>
            <input 
              type="number" 
              value={salary?.['401k_percent'] === 0 ? '' : salary?.['401k_percent']} 
              placeholder="0"
              onChange={e => setSalary({...salary, '401k_percent': e.target.value === '' ? 0 : parseFloat(e.target.value)})} 
            />
          </div>
          <button type="submit" style={{ width: 'auto', padding: '12px 25px' }}>Update</button>
        </form>
      </div>

      {/* 2. Additional Income Sources */}
      <div className="card" style={{ borderLeft: '5px solid var(--primary)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <h3 style={{ margin: 0, color: 'var(--primary)', fontSize: '1.1rem' }}>2. Additional Income</h3>
          {!showAddSource ? (
            <button onClick={() => setShowAddSource(true)} style={{ width: 'auto', padding: '8px 16px', fontSize: '0.8rem' }}>+ Add Source</button>
          ) : (
            <button onClick={() => setShowAddSource(false)} style={{ width: 'auto', padding: '8px 16px', fontSize: '0.8rem', background: 'var(--text-muted)' }}>Cancel</button>
          )}
        </div>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '20px' }}>Extra recurring monthly deposits.</p>

        {showAddSource && (
          <form onSubmit={handleCreateSource} className="grid" style={{ gridTemplateColumns: '1fr 1fr 1fr auto', gap: '15px', alignItems: 'flex-end', background: 'rgba(255,255,255,0.02)', padding: '20px', borderRadius: '16px', marginBottom: '20px', border: '1px solid var(--border)' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Name</label>
              <input required placeholder="e.g. Side Gig" value={newSource.name} onChange={e => setNewSource({...newSource, name: e.target.value})} />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Amount ($)</label>
              <input required type="number" placeholder="0.00" value={newSource.amount} onChange={e => setNewSource({...newSource, amount: e.target.value})} />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Deposit To</label>
              <select value={newSource.account_id} onChange={e => setNewSource({...newSource, account_id: e.target.value})}>
                <option value="">No Account</option>
                {cashAccounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
              </select>
            </div>
            <button type="submit" style={{ width: 'auto', padding: '12px 20px' }}>Add</button>
          </form>
        )}

        {(!incomeSources || incomeSources.length === 0) ? (
          <div style={{ padding: '30px', textAlign: 'center', background: 'rgba(255,255,255,0.02)', borderRadius: '16px', border: '1px dashed var(--border)' }}>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: 0 }}>No additional sources found.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
            {incomeSources.map(src => (
              <div key={src.id} style={{ padding: '12px 20px', background: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.2)', borderRadius: '30px', display: 'flex', gap: '15px', alignItems: 'center' }}>
                <strong style={{ fontSize: '0.9rem' }}>{src.name}</strong>
                <span className="currency positive" style={{ fontSize: '1rem' }}>+${safeFormat(src.amount)}</span>
                <button 
                  onClick={() => handleDeleteSource(src.id, src.name)}
                  style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.2rem', padding: '0 0 0 5px', width: 'auto', marginTop: 0, boxShadow: 'none' }}
                >&times;</button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 3. Automated Tax Assessment */}
      <div className="card" style={{ borderLeft: '5px solid var(--primary)' }}>
        <h3 style={{ margin: '0 0 10px 0', color: 'var(--primary)', fontSize: '1.1rem' }}>3. Tax Assessment (2025)</h3>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '20px' }}>Estimates based on your "{taxProfile.filing_status.replace('_', ' ')}" status.</p>
        <TaxEstimator refreshTrigger={0} showTitle={false} />
      </div>

      {/* 4. Monthly Net Take-Home */}
      <div className="card" style={{ borderLeft: '5px solid var(--primary)', background: 'var(--card)' }}>
        <h3 style={{ margin: '0 0 25px 0', color: 'var(--primary)', fontSize: '1.1rem' }}>4. Final Monthly Net Take-Home</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
            <span style={{ fontWeight: 600 }}>Base Salary (After Tax/401k)</span>
            <span style={{ fontWeight: 700 }} className="currency positive">${safeFormat(baseMonthlyNet)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
            <span style={{ fontWeight: 600 }}>Additional Income</span>
            <span style={{ fontWeight: 700 }} className="currency positive">+${safeFormat(totalAdditionalMonthly)}</span>
          </div>
          <div style={{ borderTop: '2px solid var(--border)', paddingTop: '20px', marginTop: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '1.5rem', fontWeight: 800 }}>Final Monthly Net</span>
            <span style={{ fontSize: '2.5rem', fontWeight: 900 }} className="currency positive">${safeFormat(totalMonthlyNet)}</span>
          </div>
        </div>
      </div>
      <style>{`
        @media (max-width: 768px) {
          .income-page .grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
};

export default IncomePage;
