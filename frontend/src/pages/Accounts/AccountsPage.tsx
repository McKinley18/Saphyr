import React, { useState, useMemo } from 'react';
import UserGuide from '../../components/UserGuide/UserGuide';
import AccountForm from '../../components/AccountForm/AccountForm';
import { useAuth } from '../../context/AuthContext';
import { useModal } from '../../context/ModalContext';
import { createGoal, deleteGoal } from '../../services/api';

interface AccountsPageProps {
  userId: string;
  accounts: any[];
  goals: any[];
  loadData: () => void;
}

const ACCENT_OPTIONS = ['var(--primary)', '#10b981', '#8b5cf6', '#f43f5e', '#f59e0b', '#06b6d4', '#fb7185', '#64748b'];

const AccountsPage: React.FC<AccountsPageProps> = ({ userId, accounts, goals, loadData }) => {
  const { isPrivacyMode, isEditMode } = useAuth();
  const { confirm } = useModal();
  const [showAddGoal, setShowAddGoal] = useState(false);
  const [newGoal, setNewGoal] = useState({ name: '', target: '', monthly: '', account_id: '' });

  const [boxColors, setBoxColors] = useState<Record<string, string>>(() => {
    const saved = localStorage.getItem('saphyr_accounts_colors');
    return saved ? JSON.parse(saved) : {};
  });

  const handleColorChange = (id: string, color: string) => {
    const newColors = { ...boxColors, [id]: color };
    setBoxColors(newColors);
    localStorage.setItem('saphyr_accounts_colors', JSON.stringify(newColors));
  };

  const cashAccounts = (accounts || []).filter(a => !a.is_bill);
  const totalCash = cashAccounts.reduce((sum, a) => sum + parseFloat(a.balance || '0'), 0);

  const safeFormat = (val: any) => {
    if (isPrivacyMode) return '••••';
    const num = parseFloat(val || '0');
    return isNaN(num) ? '0.00' : num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const handleCreateGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createGoal({
        user_id: userId,
        name: newGoal.name,
        target_amount: parseFloat(newGoal.target),
        monthly_contribution: parseFloat(newGoal.monthly),
        account_id: newGoal.account_id || null
      });
      setNewGoal({ name: '', target: '', monthly: '', account_id: '' });
      setShowAddGoal(false);
      loadData();
    } catch (err) { console.error(err); }
  };

  const handleDeleteGoal = async (id: string, name: string) => {
    const isConfirmed = await confirm({ title: 'Remove Goal', message: `Delete savings goal: "${name}"?`, confirmLabel: 'REMOVE GOAL', isDanger: true });
    if (isConfirmed) { try { await deleteGoal(id); loadData(); } catch (err) { console.error(err); } }
  };

  const renderColorPicker = (id: string) => (
    isEditMode && (
      <div style={{ position: 'absolute', top: '10px', right: '10px', zIndex: 10, display: 'flex', gap: '4px', background: 'rgba(0,0,0,0.5)', padding: '4px', borderRadius: '20px', border: '1px solid var(--border)' }}>
        {ACCENT_OPTIONS.map(c => (
          <button key={c} onClick={() => handleColorChange(id, c)} style={{ width: '12px', height: '12px', borderRadius: '50%', background: c, border: (boxColors[id] || 'var(--primary)') === c ? '1.5px solid white' : 'none', cursor: 'pointer', padding: 0, marginTop: 0 }} />
        ))}
      </div>
    )
  );

  return (
    <div className="accounts-page">
      <UserGuide guideKey="accounts_v2" title="Virtual Vault & Liquidity">
        <p>Your "Virtual Vault" represents your total liquid position. Map savings goals to specific accounts to track progress automatically.</p>
      </UserGuide>

      <div className="tech-specs-bar" style={{ display: 'flex', gap: '20px', marginBottom: '40px', background: 'var(--card)', border: '2px solid var(--border)', borderRadius: '16px', padding: '15px 25px', width: '100%', boxSizing: 'border-box', borderTop: '4px solid var(--primary)' }}>
        <div className="spec-gauge" style={{ flex: 1.5, textAlign: 'center', borderRight: '1px solid var(--item-divider)' }}>
          <label style={{ fontSize: '0.65rem', color: 'var(--primary)', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.15em' }}>Total Liquid Capital</label>
          <div className="gauge-val" style={{ color: 'var(--text)', fontFamily: 'JetBrains Mono, monospace', fontSize: '1.8rem', fontWeight: 900, marginTop: '2px' }}>${safeFormat(totalCash)}</div>
        </div>
        <div className="spec-gauge" style={{ flex: 1, textAlign: 'center', borderRight: '1px solid var(--item-divider)' }}>
          <label style={{ fontSize: '0.6rem', color: 'var(--text-muted)', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Vaulted Funds</label>
          <div className="gauge-val" style={{ color: 'var(--text)', fontFamily: 'JetBrains Mono, monospace', fontSize: '1.1rem', fontWeight: 900, marginTop: '4px' }}>--</div>
        </div>
        <div className="spec-gauge" style={{ flex: 1, textAlign: 'center' }}>
          <label style={{ fontSize: '0.6rem', color: 'var(--text-muted)', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Unallocated</label>
          <div className="gauge-val" style={{ color: 'var(--text)', fontFamily: 'JetBrains Mono, monospace', fontSize: '1.1rem', fontWeight: 900, marginTop: '4px' }}>--</div>
        </div>
      </div>

      <div className="accounts-grid-layout">
        <div className="workflow-column">
          <section className="card glow-primary" style={{ borderLeft: `5px solid ${boxColors['log'] || 'var(--primary)'}`, background: 'var(--subtle-overlay)', padding: '35px', position: 'relative', marginBottom: '30px' }}>
            {renderColorPicker('log')}
            <AccountForm onAccountAdded={loadData} customColor={boxColors['log'] || 'var(--primary)'} />
          </section>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ margin: 0, fontWeight: 900, fontSize: '1.1rem', color: 'var(--text)' }}>VIRTUAL VAULT</h3>
            <button onClick={() => setShowAddGoal(!showAddGoal)} className="add-goal-btn" style={{ fontSize: '0.65rem' }}>{showAddGoal ? 'CANCEL' : '+ NEW GOAL'}</button>
          </div>

          {showAddGoal && (
            <form onSubmit={handleCreateGoal} className="add-goal-form" style={{ marginBottom: '30px', background: 'var(--subtle-overlay)', borderTop: '4px solid var(--primary)' }}>
              <div className="form-group"><label>Goal Name</label><input required placeholder="e.g. Emergency Fund" value={newGoal.name} onChange={e => setNewGoal({...newGoal, name: e.target.value})} /></div>
              <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div className="form-group"><label>Target Amount $</label><input required type="number" placeholder="10000.00" value={newGoal.target} onChange={e => setNewGoal({...newGoal, target: e.target.value})} /></div>
                <div className="form-group"><label>Monthly Savings $</label><input required type="number" placeholder="500.00" value={newGoal.monthly} onChange={e => setNewGoal({...newGoal, monthly: e.target.value})} /></div>
              </div>
              <div className="form-group"><label>Link to Account</label><select value={newGoal.account_id} onChange={e => setNewGoal({...newGoal, account_id: e.target.value})}><option value="">-- No Link --</option>{cashAccounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</select></div>
              <button type="submit" className="primary-btn">INITIALIZE GOAL</button>
            </form>
          )}

          <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
            {(goals || []).map(goal => {
              const progress = Math.min(100, (parseFloat(goal.current_amount || '0') / parseFloat(goal.target_amount)) * 100);
              const gColor = boxColors[goal.id] || 'var(--primary)';
              return (
                <div key={goal.id} className="card glow-primary" style={{ borderTop: `4px solid ${gColor}`, position: 'relative', padding: '25px' }}>
                  {renderColorPicker(goal.id)}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 900, color: 'var(--text-muted)' }}>{goal.name.toUpperCase()}</h4>
                    <button onClick={() => handleDeleteGoal(goal.id, goal.name)} className="remove-btn-minimal" style={{ fontSize: '1.1rem' }}>&times;</button>
                  </div>
                  <div style={{ fontSize: '1.8rem', fontWeight: 900, margin: '15px 0', color: 'var(--text)' }}>${safeFormat(goal.target_amount)}</div>
                  <div className="progress-container" style={{ background: 'var(--subtle-overlay)' }}>
                    <div className="progress-bar" style={{ width: `${progress}%`, background: `linear-gradient(90deg, ${gColor} 0%, var(--primary) 100%)` }}></div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px', fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-muted)' }}>
                    <span>CONTRIB: ${safeFormat(goal.monthly_contribution)}/mo</span>
                    <span>{Math.round(progress)}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="summary-column">
          <div className="sticky-ticker-column">
            <h3 style={{ fontSize: '0.9rem', fontWeight: 900, color: 'var(--text)', marginBottom: '20px', textAlign: 'center', letterSpacing: '0.1em' }}>STRATEGY ENGINE</h3>
            <section className="card glow-primary" style={{ padding: '30px', textAlign: 'center' }}>
              <label style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-muted)' }}>LIQUIDITY STATUS</label>
              <div style={{ fontSize: '2rem', fontWeight: 900, margin: '15px 0', color: 'var(--success)' }}>HEALTHY</div>
              <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Your capital allocations are optimized for your current income profile.</p>
            </section>
          </div>
        </div>
      </div>

      <style>{`
        .accounts-page { max-width: 1200px; margin: 0 auto; padding: 0 20px; box-sizing: border-box; }
        .accounts-grid-layout { display: grid; grid-template-columns: 1fr; gap: 40px; width: 100%; box-sizing: border-box; padding-bottom: 100px; }
        @media (min-width: 1024px) { .accounts-grid-layout { grid-template-columns: minmax(0, 1.8fr) minmax(380px, 1.2fr); align-items: start; } }
        .workflow-column { display: flex; flex-direction: column; width: 100%; box-sizing: border-box; }
        .sticky-ticker-column { position: sticky; top: 100px; }
        .progress-container { width: 100%; height: 8px; border-radius: 4px; overflow: hidden; margin-top: 10px; border: 1px solid var(--border); }
        .progress-bar { height: 100%; transition: width 0.8s cubic-bezier(0.4, 0, 0.2, 1); }
        .remove-btn-minimal { background: none; border: none; color: var(--text-muted); cursor: pointer; padding: 0; width: auto; box-shadow: none; }
        .add-goal-btn { background: var(--subtle-overlay); border: 1px solid var(--border); color: var(--text); padding: 8px 15px; border-radius: 8px; cursor: pointer; width: auto; font-weight: 900; }
        .add-goal-form { padding: 25px; border-radius: 16px; border: 2px solid var(--border); }
        .primary-btn { background: var(--primary-gradient); width: 100%; fontWeight: 900; margin-top: 10px; }
      `}</style>
    </div>
  );
};

export default AccountsPage;
