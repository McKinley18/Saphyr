import React, { useState, useMemo } from 'react';
import UserGuide from '../../components/UserGuide/UserGuide';
import { createBudget, deleteBudget, deleteTransaction } from '../../services/api';
import TransactionForm from '../../components/TransactionForm/TransactionForm';
import { useAuth } from '../../context/AuthContext';
import { useModal } from '../../context/ModalContext';

interface TransactionsPageProps {
  userId: string;
  accounts: any[];
  transactions: any[];
  budgets: any[];
  taxEstimate: any;
  incomeSources: any[];
  loadData: () => void;
}

const ACCENT_OPTIONS = ['var(--primary)', '#10b981', '#8b5cf6', '#f43f5e', '#f59e0b', '#06b6d4', '#fb7185', '#64748b'];

const TransactionsPage: React.FC<TransactionsPageProps> = ({ 
  userId, accounts, transactions, budgets, taxEstimate, incomeSources, loadData 
}) => {
  const { isPrivacyMode, isEditMode } = useAuth();
  const { confirm } = useModal();
  const [showAddBudget, setShowAddBudget] = useState(false);
  const [newBudget, setNewBudget] = useState({ name: '', limit: '' });
  const [searchQuery, setSearchQuery] = useState('');
  const [visibleCount, setVisibleCount] = useState(20);
  const [viewMode, setViewMode] = useState<'table' | 'box'>('box');

  const [boxColors, setBoxColors] = useState<Record<string, string>>(() => {
    const saved = localStorage.getItem('saphyr_transactions_colors');
    return saved ? JSON.parse(saved) : {};
  });

  const handleColorChange = (id: string, color: string) => {
    const newColors = { ...boxColors, [id]: color };
    setBoxColors(newColors);
    localStorage.setItem('saphyr_transactions_colors', JSON.stringify(newColors));
  };

  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const today = new Date().getDate();
  const lastDay = new Date(currentYear, currentMonth + 1, 0).getDate();
  const daysRemaining = lastDay - today + 1;

  const safeFormat = (val: any) => {
    if (isPrivacyMode) return '••••';
    const num = parseFloat(val || '0');
    return isNaN(num) ? '0.00' : num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const metrics = useMemo(() => {
    const monthlyBills = (accounts || [])
      .filter(acc => acc && acc.is_bill)
      .reduce((sum, acc) => sum + Math.abs(parseFloat(acc.balance || '0')), 0);

    const totalOtherIncome = (incomeSources || [])
      .reduce((sum, src) => sum + parseFloat(src.amount || '0'), 0);

    const monthlyNetPay = parseFloat(taxEstimate?.monthly_net || '0');
    const startingBudget = monthlyNetPay + totalOtherIncome - monthlyBills;

    const spentThisMonth = (transactions || [])
      .filter(tx => {
        const d = new Date(tx.date);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear && tx.type === 'expense';
      })
      .reduce((sum, tx) => sum + parseFloat(tx.amount || '0'), 0);

    const remainingCapital = startingBudget - spentThisMonth;
    const dailyPower = Math.max(0, remainingCapital / daysRemaining);

    return { startingBudget, spentThisMonth, remainingCapital, dailyPower };
  }, [accounts, transactions, taxEstimate, incomeSources, currentMonth, currentYear, daysRemaining]);

  const filteredTransactions = (transactions || [])
    .filter(tx => {
      const query = searchQuery.toLowerCase();
      return (
        (tx.category?.toLowerCase().includes(query)) ||
        (tx.description?.toLowerCase().includes(query)) ||
        (tx.amount?.toString().includes(query))
      );
    });

  const displayTransactions = filteredTransactions.slice(0, visibleCount);

  const handleCreateBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createBudget({ user_id: userId, name: newBudget.name, monthly_limit: parseFloat(newBudget.limit) });
      setNewBudget({ name: '', limit: '' });
      setShowAddBudget(false);
      loadData();
    } catch (err) { console.error(err); }
  };

  const handleDeleteBudget = async (id: string, name: string) => {
    const isConfirmed = await confirm({ title: 'Delete Budget Box', message: `Are you sure you want to delete the "${name}" budget box?`, confirmLabel: 'DELETE BOX', isDanger: true });
    if (isConfirmed) { try { await deleteBudget(id); loadData(); } catch (err) { console.error(err); } }
  };

  const handleDeleteTx = async (id: string, category: string, amount: number) => {
    const isConfirmed = await confirm({ title: 'Remove Log', message: `Delete transaction: ${category} ($${amount})?`, confirmLabel: 'DELETE LOG', isDanger: true });
    if (isConfirmed) { try { await deleteTransaction(id); loadData(); } catch (err) { console.error(err); } }
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
    <div className="transactions-page">
      <UserGuide guideKey="transactions_v2" title="Live Spending Compass">
        <p>Your "Daily Power" is your most critical metric. It tells you exactly what you can spend right now while staying on track for your monthly goals.</p>
      </UserGuide>

      <div className="tech-specs-bar" style={{ display: 'flex', gap: '20px', marginBottom: '40px', background: 'var(--card)', border: '2px solid var(--border)', borderRadius: '16px', padding: '15px 25px', width: '100%', boxSizing: 'border-box', borderTop: '4px solid var(--primary)', borderLeft: '5px solid var(--primary)' }}>
        <div className="spec-gauge" style={{ flex: 1, textAlign: 'center', borderRight: '1px solid var(--item-divider)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <label style={{ fontSize: '0.6rem', color: 'var(--text-muted)', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Monthly Available</label>
          <div className="gauge-val" style={{ color: 'var(--text)', fontFamily: 'JetBrains Mono, monospace', fontSize: '1.1rem', fontWeight: 900, marginTop: '4px' }}>${safeFormat(metrics.startingBudget)}</div>
        </div>
        <div className="spec-gauge" style={{ flex: 1, textAlign: 'center', borderRight: '1px solid var(--item-divider)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <label style={{ fontSize: '0.65rem', color: 'var(--primary)', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.15em' }}>Daily Spending Power</label>
          <div className="gauge-val" style={{ color: metrics.dailyPower > 0 ? 'var(--primary)' : 'var(--danger)', fontFamily: 'JetBrains Mono, monospace', fontSize: '1.8rem', fontWeight: 900, marginTop: '2px' }}>${safeFormat(metrics.dailyPower)}</div>
        </div>
        <div className="spec-gauge" style={{ flex: 1, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <label style={{ fontSize: '0.6rem', color: 'var(--text-muted)', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Days Remaining</label>
          <div className="gauge-val" style={{ color: 'var(--text)', fontFamily: 'JetBrains Mono, monospace', fontSize: '1.1rem', fontWeight: 900, marginTop: '4px' }}>{daysRemaining} Days</div>
        </div>
      </div>

      <div className="accounts-grid-layout">
        <div className="workflow-column">
          <section className="card" style={{ borderTop: `4px solid ${boxColors['log'] || 'var(--primary)'}`, borderLeft: `5px solid ${boxColors['log'] || 'var(--primary)'}`, background: 'var(--subtle-overlay)', padding: '35px', position: 'relative', marginBottom: '30px' }}>
            {renderColorPicker('log')}
            <TransactionForm accounts={accounts} budgets={budgets} userId={userId} onTransactionAdded={loadData} customColor={boxColors['log'] || 'var(--primary)'} />
          </section>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ margin: 0, fontWeight: 900, fontSize: '1.1rem', color: 'var(--text)' }}>BUDGET BOXES</h3>
            <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
              <div style={{ display: 'flex', background: 'var(--subtle-overlay)', padding: '3px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                <button onClick={() => setViewMode('table')} style={{ padding: '4px 10px', fontSize: '0.6rem', background: viewMode === 'table' ? 'var(--primary-gradient)' : 'transparent', border: 'none', borderRadius: '6px', color: 'white', cursor: 'pointer', boxShadow: 'none', width: 'auto', marginTop: 0 }}>TABLE</button>
                <button onClick={() => setViewMode('box')} style={{ padding: '4px 10px', fontSize: '0.6rem', background: viewMode === 'box' ? 'var(--primary-gradient)' : 'transparent', border: 'none', borderRadius: '6px', color: 'white', cursor: 'pointer', boxShadow: 'none', width: 'auto', marginTop: 0 }}>BOX</button>
              </div>
              <button onClick={() => setShowAddBudget(!showAddBudget)} className="add-goal-btn" style={{ fontSize: '0.65rem' }}>{showAddBudget ? 'CANCEL' : '+ NEW BOX'}</button>
            </div>
          </div>

          {showAddBudget && (
            <form onSubmit={handleCreateBudget} className="add-goal-form" style={{ marginBottom: '30px', background: 'var(--subtle-overlay)', borderTop: '4px solid var(--primary)', borderLeft: '5px solid var(--primary)' }}>
              <div className="form-group"><label>Box Name</label><input required placeholder="e.g. Groceries" value={newBudget.name} onChange={e => setNewBudget({...newBudget, name: e.target.value})} /></div>
              <div className="form-group">
                <label>Monthly Limit</label>
                <div className="currency-input-wrapper">
                  <span className="currency-prefix">$</span>
                  <input required type="number" placeholder="0.00" value={newBudget.limit} onChange={e => setNewBudget({...newBudget, limit: e.target.value})} />
                </div>
              </div>
              <button type="submit" className="primary-btn">CREATE BOX</button>
            </form>
          )}

          <div className="grid" style={{ gridTemplateColumns: viewMode === 'box' ? 'repeat(auto-fill, minmax(240px, 1fr))' : '1fr', gap: '20px' }}>
            {(budgets || []).map(budget => {
              const spent = (transactions || []).filter(tx => {
                const d = new Date(tx.date);
                return tx.budget_category_id === budget.id && d.getMonth() === currentMonth && d.getFullYear() === currentYear && tx.type === 'expense';
              }).reduce((sum, tx) => sum + parseFloat(tx.amount || '0'), 0);
              const limit = parseFloat(budget.monthly_limit || '0');
              const remaining = limit - spent;
              const progress = Math.min(100, (spent / limit) * 100);
              const bColor = boxColors[budget.id] || 'var(--primary)';

              return (
                <div key={budget.id} className="card" style={{ borderTop: `4px solid ${bColor}`, borderLeft: `5px solid ${bColor}`, position: 'relative', padding: '25px' }}>
                  {renderColorPicker(budget.id)}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 900, color: 'var(--text-muted)' }}>{budget.name.toUpperCase()}</h4>
                    <button onClick={() => handleDeleteBudget(budget.id, budget.name)} className="remove-btn-minimal" style={{ fontSize: '1.1rem' }}>&times;</button>
                  </div>
                  <div style={{ fontSize: '1.8rem', fontWeight: 900, margin: '15px 0', color: remaining >= 0 ? 'var(--text)' : 'var(--danger)' }}>${safeFormat(remaining)}</div>
                  <div className="progress-container" style={{ background: 'var(--subtle-overlay)' }}>
                    <div className="progress-bar" style={{ 
                      width: `${progress}%`, 
                      background: progress > 90 ? 'var(--danger-gradient)' : (progress > 50 ? 'var(--warning-gradient)' : 'var(--success-gradient)') 
                    }}></div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px', fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-muted)' }}>
                    <span>SPENT: ${safeFormat(spent)}</span>
                    <span>LIMIT: ${safeFormat(limit)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="summary-column">
          <div className="sticky-ticker-column">
            <h3 style={{ fontSize: '0.9rem', fontWeight: 900, color: 'var(--text)', marginBottom: '20px', textAlign: 'center', letterSpacing: '0.1em' }}>RECENT LOGS</h3>
            <div className="form-group">
              <input type="text" placeholder="SEARCH LOGS..." value={searchQuery} onChange={e => {setSearchQuery(e.target.value); setVisibleCount(20);}} style={{ background: 'var(--input-bg)', fontSize: '0.75rem', border: '2px solid var(--border)' }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {displayTransactions.map(tx => {
                const acc = accounts.find(a => a.id === tx.account_id);
                const budget = budgets.find(b => b.id === tx.budget_category_id);
                return (
                  <div key={tx.id} className="ticker-item card glow-primary" style={{ padding: '15px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: '0.9rem' }}>{tx.category}</div>
                        <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{tx.date?.split('T')[0]} • {acc?.name || 'CASH'}</div>
                        {budget && <div style={{ fontSize: '0.6rem', color: 'var(--primary)', fontWeight: 900, marginTop: '2px' }}>[{budget.name.toUpperCase()}]</div>}
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontWeight: 900, fontSize: '1rem' }} className={`currency ${tx.type === 'income' ? 'positive' : 'negative'}`}>
                          {tx.type === 'income' ? '+' : '-'}${safeFormat(tx.amount)}
                        </div>
                        <button onClick={() => handleDeleteTx(tx.id, tx.category, tx.amount)} className="remove-btn-minimal" style={{ fontSize: '0.6rem', fontWeight: 800, marginTop: '5px' }}>REMOVE</button>
                      </div>
                    </div>
                  </div>
                );
              })}
              {filteredTransactions.length > visibleCount && (
                <button onClick={() => setVisibleCount(prev => prev + 20)} className="primary-btn" style={{ fontSize: '0.7rem' }}>LOAD MORE</button>
              )}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .transactions-page { max-width: 1200px; margin: 0 auto; padding: 0 20px; box-sizing: border-box; }
        .accounts-grid-layout { display: grid; grid-template-columns: 1fr; gap: 40px; width: 100%; box-sizing: border-box; padding-bottom: 100px; }
        @media (min-width: 1024px) { .accounts-grid-layout { grid-template-columns: minmax(0, 1.8fr) minmax(380px, 1.2fr); align-items: start; } }
        .workflow-column { display: flex; flex-direction: column; width: 100%; box-sizing: border-box; }
        .sticky-ticker-column { position: sticky; top: 100px; max-height: calc(100vh - 150px); overflow-y: auto; scrollbar-width: none; }
        .ticker-item { border: 2px solid var(--border) !important; background: var(--bg); transition: all 0.2s ease; }
        .ticker-item:hover { transform: translateX(-4px); border-color: var(--primary) !important; }
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

export default TransactionsPage;
