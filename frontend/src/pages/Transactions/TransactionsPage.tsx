import React, { useState } from 'react';
import UserGuide from '../../components/UserGuide/UserGuide';
import { createBudget, deleteBudget, deleteTransaction } from '../../services/api';
import TransactionForm from '../../components/TransactionForm/TransactionForm';
import { useAuth } from '../../context/AuthContext';

interface TransactionsPageProps {
  userId: string;
  accounts: any[];
  transactions: any[];
  budgets: any[];
  taxEstimate: any;
  incomeSources: any[];
  loadData: () => void;
}

const TransactionsPage: React.FC<TransactionsPageProps> = ({ 
  userId, accounts, transactions, budgets, taxEstimate, incomeSources, loadData 
}) => {
  const { isPrivacyMode } = useAuth();
  const [showAddBudget, setShowAddBudget] = useState(false);
  const [newBudget, setNewBudget] = useState({ name: '', limit: '' });
  const [searchQuery, setSearchQuery] = useState('');
  const [visibleCount, setVisibleCount] = useState(20);

  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();

  const safeFormat = (val: any) => {
    if (isPrivacyMode) return '••••';
    const num = parseFloat(val || '0');
    return isNaN(num) ? '0.00' : num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const handleDeleteTx = async (id: string, category: string, amount: number) => {
    if (window.confirm(`Delete transaction: ${category} ($${amount})?`)) {
      await deleteTransaction(id);
      loadData();
    }
  };

  const filteredTransactions = (transactions || [])
    .filter(tx => {
      const query = searchQuery.toLowerCase();
      const matchesSearch = (
        (tx.category?.toLowerCase().includes(query)) ||
        (tx.description?.toLowerCase().includes(query)) ||
        (tx.amount?.toString().includes(query))
      );
      
      if (searchQuery) return matchesSearch;
      
      const d = new Date(tx.date);
      return matchesSearch && d.getMonth() === currentMonth && d.getFullYear() === currentYear && tx.type === 'expense';
    });

  const displayTransactions = filteredTransactions.slice(0, visibleCount);

  const monthlyBills = (accounts || [])
    .filter(acc => acc && acc.is_bill)
    .reduce((sum, acc) => sum + Math.abs(parseFloat(acc.balance || '0')), 0);

  const totalAdditionalMonthly = (incomeSources || [])
    .reduce((sum, src) => sum + parseFloat(src.amount || '0'), 0);

  const monthlyNetPay = parseFloat(taxEstimate?.monthly_net || '0');
  const startingBudget = monthlyNetPay + totalAdditionalMonthly - monthlyBills;

  const handleCreateBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createBudget({ user_id: userId, name: newBudget.name, monthly_limit: parseFloat(newBudget.limit) });
      setNewBudget({ name: '', limit: '' });
      setShowAddBudget(false);
      loadData();
    } catch (err) { console.error("Budget creation failed:", err); }
  };

  const handleDeleteBudget = async (id: string, name: string) => {
    if (window.confirm(`Delete budget box "${name}"?`)) {
      try { await deleteBudget(id); loadData(); } catch (err) { console.error("Budget delete failed:", err); }
    }
  };

  const exportToCSV = () => {
    const headers = ['Date', 'Category', 'Description', 'Amount', 'Type'];
    const rows = (transactions || []).map(tx => [tx.date?.split('T')[0], `"${tx.category || ''}"`, `"${tx.description || ''}"`, tx.amount, tx.type]);
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `transactions_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  return (
    <div className="transactions-page" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <UserGuide guideKey="transactions" title="Daily Activity">
        <p>Log your spending and stay within your limits.</p>
      </UserGuide>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', margin: '20px 0', gap: '20px' }}>
        <div>
          <h2 style={{ margin: 0, color: 'var(--text)', fontSize: '2rem' }}>Daily Activity</h2>
          <p style={{ fontSize: '1rem', color: 'var(--text-muted)', marginTop: '10px', fontWeight: 600 }}>
            Budget Allowance: <strong className="currency positive" style={{ fontWeight: 800 }}>${safeFormat(startingBudget)}</strong> <span style={{ opacity: 0.7 }}>(After Bills)</span>
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px', width: '100%', maxWidth: '400px', justifyContent: 'center' }}>
          <button onClick={exportToCSV} style={{ flex: 1, padding: '10px', background: 'rgba(255,255,255,0.05)', color: 'var(--text-muted)', fontSize: '0.85rem', boxShadow: 'none' }}>Export CSV</button>
          {!showAddBudget ? (
            <button onClick={() => setShowAddBudget(true)} style={{ flex: 1, padding: '10px', fontSize: '0.85rem' }}>+ New Box</button>
          ) : (
            <button onClick={() => setShowAddBudget(false)} style={{ flex: 1, padding: '10px', background: 'var(--text-muted)', fontSize: '0.85rem' }}>Cancel</button>
          )}
        </div>
      </div>

      {showAddBudget && (
        <div className="card" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)' }}>
          <h3 style={{ marginTop: 0, color: 'var(--text)' }}>Create Budget Box</h3>
          <form onSubmit={handleCreateBudget} style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', alignItems: 'flex-end' }}>
            <div className="form-group" style={{ flex: '1 1 200px', marginBottom: 0 }}>
              <label>Box Name</label>
              <input required placeholder="e.g. Groceries" value={newBudget.name} onChange={e => setNewBudget({...newBudget, name: e.target.value})} />
            </div>
            <div className="form-group" style={{ flex: '1 1 100px', marginBottom: 0 }}>
              <label>Limit ($)</label>
              <input required type="number" placeholder="0.00" value={newBudget.limit} onChange={e => setNewBudget({...newBudget, limit: e.target.value})} />
            </div>
            <button type="submit" style={{ width: 'auto', padding: '12px 30px' }}>Create Box</button>
          </form>
        </div>
      )}

      {/* Budget Boxes Grid */}
      <div className="grid" style={{ gap: '20px' }}>
        {(budgets || []).map(budget => {
          const spent = (transactions || []).filter(tx => {
            if (!tx || !tx.date) return false;
            const d = new Date(tx.date);
            return tx.budget_category_id === budget.id && d.getMonth() === currentMonth && d.getFullYear() === currentYear && tx.type === 'expense';
          }).reduce((sum, tx) => sum + parseFloat(tx.amount || '0'), 0);
          
          const limit = parseFloat(budget.monthly_limit || '0');
          const remaining = limit - spent;
          const progress = limit > 0 ? Math.min(100, (spent / limit) * 100) : 0;

          return (
            <div key={budget.id} className="card" style={{ borderTop: `4px solid ${progress > 90 ? 'var(--danger)' : 'var(--primary)'}` }}>
              <button onClick={() => handleDeleteBudget(budget.id, budget.name)} style={{ position: 'absolute', top: '15px', right: '15px', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.2rem', padding: 0, width: 'auto', marginTop: 0, boxShadow: 'none' }}>&times;</button>
              <h3 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--text)', fontWeight: 800 }}>{budget.name}</h3>
              <div style={{ fontSize: '2rem', fontWeight: 900, margin: '15px 0', color: remaining >= 0 ? 'var(--text)' : 'var(--danger)' }}>${safeFormat(remaining)}</div>
              <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ width: `${progress}%`, height: '100%', background: progress > 90 ? 'var(--danger)' : 'var(--primary)' }}></div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid">
        <section>
          <TransactionForm accounts={accounts} budgets={budgets} userId={userId} onTransactionAdded={loadData} />
        </section>

        <section>
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <h3 style={{ color: 'var(--text)', margin: 0, fontWeight: 800 }}>Recent Activity</h3>
            <input type="text" placeholder="Search..." value={searchQuery} onChange={e => {setSearchQuery(e.target.value); setVisibleCount(20);}} />

            <div className="table-container">
              <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
                <thead>
                  <tr style={{ textAlign: 'left', fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                    <th style={{ padding: '10px 0' }}>Details</th>
                    <th style={{ textAlign: 'right' }}>Amount</th>
                    <th style={{ width: '60px' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {displayTransactions.map(tx => {
                    const acc = accounts.find(a => a.id === tx.account_id);
                    const budget = budgets.find(b => b.id === tx.budget_category_id);
                    return (
                      <tr key={tx.id}>
                        <td style={{ padding: '12px 0' }}>
                          <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{tx.category}</div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{tx.date?.split('T')[0]} • {acc?.name}</div>
                          {budget && <div style={{ fontSize: '0.65rem', color: 'var(--primary)', fontWeight: 800, marginTop: '2px' }}>{budget.name.toUpperCase()}</div>}
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 800 }} className="currency negative">-${safeFormat(tx.amount)}</td>
                        <td style={{ textAlign: 'right' }}>
                          <button onClick={() => handleDeleteTx(tx.id, tx.category, tx.amount)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '0.6rem', fontWeight: 800, cursor: 'pointer', padding: 0, width: 'auto', marginTop: 0, boxShadow: 'none' }}>REMOVE</button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {filteredTransactions.length > visibleCount && (
                <button 
                  onClick={() => setVisibleCount(prev => prev + 20)}
                  style={{ width: '100%', marginTop: '20px', background: 'rgba(255,255,255,0.05)', color: 'var(--text)', fontWeight: 800, fontSize: '0.7rem' }}
                >
                  LOAD MORE
                </button>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default TransactionsPage;
