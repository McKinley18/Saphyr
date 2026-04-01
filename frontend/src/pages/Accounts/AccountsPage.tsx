import React, { useState, useMemo } from 'react';
import UserGuide from '../../components/UserGuide/UserGuide';
import AccountForm from '../../components/AccountForm/AccountForm';
import { deleteAccount, createGoal, updateGoal, deleteGoal } from '../../services/api';
import { useModal } from '../../context/ModalContext';
import { useAuth } from '../../context/AuthContext';

interface AccountsPageProps {
  userId: string;
  accounts: any[];
  goals: any[];
  loadData: () => void;
  taxEstimate: any;
  incomeSources: any[];
}

const ACCENT_OPTIONS = ['var(--primary)', '#10b981', '#8b5cf6', '#f43f5e', '#f59e0b', '#06b6d4', '#fb7185', '#64748b'];

const AccountsPage: React.FC<AccountsPageProps> = ({ userId, accounts, goals, loadData, taxEstimate, incomeSources }) => {
  const { confirm } = useModal();
  const { isEditMode } = useAuth();
  const [showAddGoal, setShowAddGoal] = useState(false);
  const [editingAccount, setEditingAccount] = useState<any>(null);
  const [newGoal, setNewGoal] = useState({ name: '', target: '', current: '', contribution: '', account_id: '' });

  const [boxColors, setBoxColors] = useState<Record<string, string>>(() => {
    const saved = localStorage.getItem('saphyr_accounts_colors');
    return saved ? JSON.parse(saved) : {};
  });

  const handleColorChange = (id: string, color: string) => {
    const newColors = { ...boxColors, [id]: color };
    setBoxColors(newColors);
    localStorage.setItem('saphyr_accounts_colors', JSON.stringify(newColors));
  };

  const safeFormat = (val: any) => {
    const num = parseFloat(val || '0');
    return isNaN(num) ? '0.00' : num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const liquidAccounts = (accounts || [])
    .filter(acc => acc && !acc.is_bill);

  const totalCash = liquidAccounts.reduce((sum, acc) => sum + parseFloat(acc.balance || '0'), 0);
  const totalMonthlyDeposits = liquidAccounts.reduce((sum, acc) => sum + parseFloat(acc.monthly_deposit || '0'), 0);
  const runwayMonths = totalMonthlyDeposits > 0 ? (totalCash / totalMonthlyDeposits).toFixed(1) : '∞';

  const groupedAccounts = liquidAccounts.reduce((groups: any, acc: any) => {
    const group = acc.group_name || 'Uncategorized';
    if (!groups[group]) groups[group] = [];
    groups[group].push(acc);
    return groups;
  }, {});

  const groupNames = Object.keys(groupedAccounts).sort();

  const strategyAnalysis = useMemo(() => {
    const monthlyNet = parseFloat(taxEstimate?.monthly_net || 0);
    const totalOtherIncome = (incomeSources || []).reduce((sum, s) => {
      const amt = parseFloat(s.amount);
      const multiplier = s.frequency === 'weekly' ? (52/12) : (s.frequency === 'bi-weekly' ? (26/12) : 1);
      return sum + (amt * multiplier);
    }, 0);
    const monthlyInflow = monthlyNet + totalOtherIncome;
    const monthlyBills = (accounts || []).filter(acc => acc?.is_bill).reduce((sum, acc) => sum + Math.abs(parseFloat(acc.balance || '0')), 0);
    const unallocatedCapital = monthlyInflow - monthlyBills;
    const currentGoalContributions = (goals || []).reduce((sum, g) => sum + parseFloat(g.monthly_contribution || '0'), 0);
    const surplus = unallocatedCapital - currentGoalContributions;
    return { unallocatedCapital, currentGoalContributions, surplus, isOverextended: surplus < 0 };
  }, [taxEstimate, incomeSources, accounts, goals]);

  const handleDelete = async (id: string, name: string) => {
    const isConfirmed = await confirm({ title: 'Remove Account', message: `Are you sure you want to remove "${name}"?`, confirmLabel: 'REMOVE ACCOUNT', isDanger: true });
    if (isConfirmed) { try { await deleteAccount(id); loadData(); } catch (err) { console.error(err); } }
  };

  const handleEdit = (acc: any) => {
    setEditingAccount(acc);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCreateGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createGoal({ user_id: userId, name: newGoal.name, target_amount: parseFloat(newGoal.target), current_amount: parseFloat(newGoal.current) || 0, monthly_contribution: parseFloat(newGoal.contribution) || 0, account_id: newGoal.account_id || null });
      setNewGoal({ name: '', target: '', current: '', contribution: '', account_id: '' });
      setShowAddGoal(false);
      loadData();
    } catch (err) { console.error(err); }
  };

  const handleUpdateGoalProgress = async (id: string, name: string, current: number) => {
    const amount = window.prompt(`Enter amount to add to "${name}":`, "0");
    if (amount && !isNaN(parseFloat(amount))) {
      try {
        const newTotal = current + parseFloat(amount);
        await updateGoal(id, { current_amount: newTotal });
        loadData();
      } catch (err) { console.error(err); }
    }
  };

  const handleDeleteGoal = async (id: string, name: string) => {
    const isConfirmed = await confirm({ title: 'Delete Envelope', message: `Are you sure you want to delete the "${name}" savings envelope?`, confirmLabel: 'DELETE ENVELOPE', isDanger: true });
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
      <UserGuide guideKey="accounts_v3" title="Liquidity & Vaults">
        <p>Analyze your liquid position and optimize your savings strategy. Link envelopes to accounts to build specialized wealth buckets.</p>
      </UserGuide>

      <div className="tech-specs-bar" style={{ display: 'flex', gap: '20px', marginBottom: '40px', background: 'var(--card)', border: '2px solid var(--border)', borderRadius: '16px', padding: '15px 25px', width: '100%', boxSizing: 'border-box' }}>
        <div className="spec-gauge" style={{ flex: 1, textAlign: 'center', borderRight: '1px solid var(--item-divider)' }}>
          <label style={{ fontSize: '0.6rem', color: 'var(--text-muted)', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Total Liquid Cash</label>
          <div className="gauge-val" style={{ color: 'var(--text)', fontFamily: 'JetBrains Mono, monospace', fontSize: '1.1rem', fontWeight: 900, marginTop: '4px' }}>${safeFormat(totalCash)}</div>
        </div>
        <div className="spec-gauge" style={{ flex: 1, textAlign: 'center', borderRight: '1px solid var(--item-divider)' }}>
          <label style={{ fontSize: '0.6rem', color: 'var(--text-muted)', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Monthly Inflow</label>
          <div className="gauge-val" style={{ color: 'var(--text)', fontFamily: 'JetBrains Mono, monospace', fontSize: '1.1rem', fontWeight: 900, marginTop: '4px' }}>+${safeFormat(totalMonthlyDeposits)}</div>
        </div>
        <div className="spec-gauge" style={{ flex: 1, textAlign: 'center' }}>
          <label style={{ fontSize: '0.6rem', color: 'var(--text-muted)', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Cash Runway</label>
          <div className="gauge-val" style={{ color: 'var(--text)', fontFamily: 'JetBrains Mono, monospace', fontSize: '1.1rem', fontWeight: 900, marginTop: '4px' }}>{runwayMonths} Months</div>
        </div>
      </div>

      <div className="accounts-grid-layout">
        <div className="workflow-column">
          <section className="card" style={{ borderLeft: `5px solid ${boxColors['strategy'] || 'var(--primary)'}`, background: 'rgba(255,255,255,0.01)', marginBottom: '30px', position: 'relative', padding: '35px' }}>
            {renderColorPicker('strategy')}
            <h3 style={{ margin: 0, fontWeight: 900, fontSize: '1rem', textAlign: 'center', color: 'var(--text)' }}>SAPHYR STRATEGY ENGINE</h3>
            <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div style={{ fontSize: '0.85rem', lineHeight: '1.6', color: 'var(--text-muted)', textAlign: 'center' }}>Analysis based on <strong>${safeFormat(strategyAnalysis.unallocatedCapital)}</strong> monthly unallocated capital.</div>
              {strategyAnalysis.isOverextended ? (
                <div style={{ padding: '15px', background: 'rgba(239, 68, 68, 0.05)', borderRadius: '12px', border: '1px solid var(--danger)', color: 'var(--danger)', fontSize: '0.8rem', fontWeight: 700, textAlign: 'center' }}>ADVISORY: Your current savings goals (-${safeFormat(strategyAnalysis.currentGoalContributions)}/mo) exceed your unallocated capital.</div>
              ) : (
                <div style={{ padding: '15px', background: 'rgba(16, 185, 129, 0.05)', borderRadius: '12px', border: '1px solid var(--success)', color: 'var(--success)', fontSize: '0.8rem', fontWeight: 700, textAlign: 'center' }}>OPTIMIZATION: You have a surplus of <strong>${safeFormat(strategyAnalysis.surplus)}</strong>. Consider accelerating your {goals[0]?.name || 'primary'} goal.</div>
              )}
              <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', fontStyle: 'italic', textAlign: 'center' }}>*Suggestions are estimates based on recorded data.</div>
            </div>
          </section>

          <AccountForm userId={userId} onAccountAdded={() => { loadData(); setEditingAccount(null); }} groups={groupNames} initialData={editingAccount} onCancel={() => setEditingAccount(null)} customColor={boxColors['form'] || 'var(--primary)'} renderColorPicker={() => renderColorPicker('form')} />
        </div>

        <div className="summary-column">
          <div className="sticky-ticker-column">
            <div style={{ marginBottom: '30px' }}>
              <h3 style={{ fontSize: '0.9rem', fontWeight: 900, color: 'var(--text)', marginBottom: '15px', textAlign: 'center', letterSpacing: '0.1em' }}>LIQUID ACCOUNTS</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {groupNames.map(group => (
                  <div key={group}>
                    <div style={{ fontSize: '0.65rem', fontWeight: 900, color: 'var(--text-muted)', marginBottom: '8px', paddingLeft: '5px' }}>{group.toUpperCase()}</div>
                    {groupedAccounts[group].map((acc: any) => (
                      <div key={acc.id} className="ticker-item card" style={{ padding: '15px', marginBottom: '8px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div><div style={{ fontWeight: 800, fontSize: '0.9rem' }}>{acc.name}</div><div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>+${safeFormat(acc.monthly_deposit)}/mo</div></div>
                          <div style={{ textAlign: 'right' }}><div style={{ fontWeight: 900, fontSize: '1rem' }} className="currency positive">${safeFormat(acc.balance)}</div><div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '4px' }}><button onClick={() => handleEdit(acc)} className="remove-btn-minimal" style={{ fontSize: '0.6rem', fontWeight: 800 }}>EDIT</button><button onClick={() => handleDelete(acc.id, acc.name)} className="remove-btn-minimal">&times;</button></div></div>
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>

            <div className="card sticky-vault" style={{ border: `2px solid ${boxColors['vault'] || 'var(--border)'}`, borderLeftWidth: '5px', borderLeftColor: boxColors['vault'] || 'var(--primary)', background: 'var(--bg)', padding: '35px', position: 'relative' }}>
              {renderColorPicker('vault')}
              <div style={{ textAlign: 'center', marginBottom: '25px' }}>
                <label style={{ fontSize: '0.65rem', fontWeight: 900, color: boxColors['vault'] || 'var(--primary)', letterSpacing: '0.15em' }}>VIRTUAL VAULT</label>
                <h3 style={{ margin: '5px 0 15px 0', fontWeight: 900, fontSize: '1.2rem', color: 'var(--text)' }}>Savings Envelopes</h3>
                <button onClick={() => setShowAddGoal(!showAddGoal)} className="add-goal-btn">{showAddGoal ? 'CANCEL' : '+ CREATE ENVELOPE'}</button>
              </div>
              {showAddGoal && (
                <form onSubmit={handleCreateGoal} className="add-goal-form">
                  <div className="form-group"><label>Name</label><input required value={newGoal.name} onChange={e => setNewGoal({...newGoal, name: e.target.value})} /></div>
                  <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '10px' }}><div className="form-group"><label>Target $</label><input required type="number" value={newGoal.target} onChange={e => setNewGoal({...newGoal, target: e.target.value})} /></div><div className="form-group"><label>Add/mo $</label><input type="number" value={newGoal.contribution} onChange={e => setNewGoal({...newGoal, contribution: e.target.value})} /></div></div>
                  <button type="submit" className="primary-btn">INITIALIZE</button>
                </form>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
                {(goals || []).map(goal => {
                  const target = parseFloat(goal.target_amount || '1');
                  const current = parseFloat(goal.current_amount || '0');
                  const contribution = parseFloat(goal.monthly_contribution || '0');
                  const progress = Math.min(100, (current / target) * 100);
                  const remaining = target - current;
                  const monthsToGoal = contribution > 0 ? Math.ceil(remaining / contribution) : null;
                  return (
                    <div key={goal.id} className="vault-envelope">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}><div style={{ fontWeight: 900, fontSize: '0.85rem' }}>{goal.name.toUpperCase()}</div><button onClick={() => handleDeleteGoal(goal.id, goal.name)} className="remove-btn-minimal">&times;</button></div>
                      <div className="progress-container" onClick={() => handleUpdateGoalProgress(goal.id, goal.name, current)}><div className="progress-bar" style={{ width: `${progress}%`, background: progress === 100 ? 'var(--success)' : (boxColors['vault'] || 'var(--primary)') }}></div><span className="progress-text">{progress.toFixed(0)}%</span></div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', fontSize: '0.7rem', fontWeight: 700 }}><span className="currency">${safeFormat(current)} / ${safeFormat(target)}</span><span style={{ color: monthsToGoal ? 'var(--text-muted)' : 'var(--danger)' }}>{monthsToGoal ? `${monthsToGoal}mo` : 'Underfunded'}</span></div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
      <style>{`
        .accounts-page { max-width: 1200px; margin: 0 auto; padding: 0 20px; box-sizing: border-box; }
        .accounts-grid-layout { display: grid; grid-template-columns: 1fr; gap: 40px; width: 100%; box-sizing: border-box; padding-bottom: 100px; }
        @media (min-width: 1024px) { .accounts-grid-layout { grid-template-columns: minmax(0, 1.8fr) minmax(380px, 1.2fr); align-items: start; } }
        .workflow-column { display: flex; flex-direction: column; width: 100%; box-sizing: border-box; }
        .item-list { display: flex; flex-direction: column; gap: 10px; }
        .ticker-item { border: 2px solid var(--border) !important; background: var(--bg); transition: all 0.2s ease; }
        .ticker-item:hover { transform: translateX(-4px); border-color: var(--primary) !important; }
        .edit-btn-small { background: none; border: 1px solid var(--primary); color: var(--primary); font-size: 0.65rem; font-weight: 900; padding: 4px 10px; border-radius: 6px; cursor: pointer; boxShadow: none; marginTop: 0; }
        .remove-btn { background: none; border: none; color: var(--text-muted); font-size: 1.5rem; cursor: pointer; padding: 0; width: auto; marginTop: 0; box-shadow: none; }
        .remove-btn-minimal { background: none; border: none; color: var(--text-muted); cursor: pointer; padding: 0; width: auto; marginTop: 0; box-shadow: none; }
        .add-goal-btn { background: rgba(255,255,255,0.05); border: 1px solid var(--border); color: var(--text); font-size: 0.65rem; font-weight: 900; padding: 8px 15px; border-radius: 8px; cursor: pointer; width: auto; marginTop: 0; }
        .progress-container { width: 100%; height: 18px; background: rgba(255,255,255,0.05); border-radius: 9px; position: relative; overflow: hidden; cursor: pointer; border: 1px solid var(--border); }
        .progress-bar { height: 100%; transition: width 0.8s cubic-bezier(0.4, 0, 0.2, 1); }
        .progress-text { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); font-size: 0.6rem; font-weight: 900; color: white; }
        .sticky-ticker-column { position: sticky; top: 100px; max-height: calc(100vh - 150px); overflow-y: auto; scrollbar-width: none; }
        .primary-btn { background: var(--primary); width: 100%; fontWeight: 900; margin-top: 10px; }
      `}</style>
    </div>
  );
};

export default AccountsPage;
