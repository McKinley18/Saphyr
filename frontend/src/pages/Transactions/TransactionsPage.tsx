import React, { useState } from 'react';
import UserGuide from '../../components/UserGuide/UserGuide';
import { createBudget, deleteBudget } from '../../services/api';
import TransactionForm from '../../components/TransactionForm/TransactionForm';

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
  userId, 
  accounts, 
  transactions, 
  budgets,
  taxEstimate,
  incomeSources,
  loadData 
}) => {
  const [showAddBudget, setShowAddBudget] = useState(false);
  const [newBudget, setNewBudget] = useState({ name: '', limit: '' });

  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();

  const safeFormat = (val: any) => {
    const num = parseFloat(val || '0');
    return isNaN(num) ? '0.00' : num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

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
      await createBudget({
        user_id: userId,
        name: newBudget.name,
        monthly_limit: parseFloat(newBudget.limit)
      });
      setNewBudget({ name: '', limit: '' });
      setShowAddBudget(false);
      loadData();
    } catch (err) {
      console.error("Budget creation failed:", err);
    }
  };

  const handleDeleteBudget = async (id: string, name: string) => {
    if (window.confirm(`Delete budget box "${name}"? Transactions will remain but won't be grouped here.`)) {
      try {
        await deleteBudget(id);
        loadData();
      } catch (err) {
        console.error("Budget delete failed:", err);
      }
    }
  };

  const exportToCSV = () => {
    try {
      const headers = ['Date', 'Category', 'Description', 'Amount', 'Type'];
      const rows = (transactions || []).map(tx => [
        tx.date ? tx.date.split('T')[0] : '',
        `"${tx.category || ''}"`,
        `"${tx.description || ''}"`,
        tx.amount,
        tx.type
      ]);

      const csvContent = [
        headers.join(','),
        ...rows.map(r => r.join(','))
      ].join('\n');
      
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `transactions_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error("Failed to export CSV:", err);
    }
  };

  return (
    <div className="transactions-page">
      <UserGuide guideKey="transactions" title="Daily Activity">
        <p>Log your spending and stay within your limits.</p>
        <ul style={{ paddingLeft: '20px', marginTop: '10px' }}>
          <li><strong>Budget Boxes:</strong> Create boxes for specific categories (e.g. Groceries). Set a limit to track how much you have left to spend.</li>
          <li><strong>Logging:</strong> When you buy something, select the "Source Account" and the "Budget Box" it belongs to.</li>
          <li><strong>Inflow:</strong> Use "Deposit / Inflow" to log money coming into your accounts (like side-gigs).</li>
          <li><strong>Export:</strong> Click "Export CSV" to download your history for Excel or tax season.</li>
        </ul>
      </UserGuide>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', marginBottom: '40px', gap: '20px' }}>
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
        <div className="card" style={{ marginBottom: '35px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)' }}>
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
      <div className="grid" style={{ marginBottom: '45px' }}>
        {(budgets || []).map(budget => {
          const spent = (transactions || [])
            .filter(tx => {
              if (!tx || !tx.date) return false;
              const d = new Date(tx.date);
              return tx.budget_category_id === budget.id && 
                     d.getMonth() === currentMonth && 
                     d.getFullYear() === currentYear && 
                     tx.type === 'expense';
            })
            .reduce((sum, tx) => sum + parseFloat(tx.amount || '0'), 0);
          
          const limit = parseFloat(budget.monthly_limit || '0');
          const remaining = limit - spent;
          const progress = limit > 0 ? Math.min(100, (spent / limit) * 100) : 0;

          return (
            <div key={budget.id} className="card" style={{ position: 'relative', borderTop: `4px solid ${progress > 90 ? 'var(--danger)' : 'var(--primary)'}` }}>
              <button 
                onClick={() => handleDeleteBudget(budget.id, budget.name)}
                style={{ position: 'absolute', top: '15px', right: '15px', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.4rem', padding: 0, width: 'auto', marginTop: 0, boxShadow: 'none' }}
              >&times;</button>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                <h3 style={{ margin: 0, fontSize: '1.15rem', color: 'var(--text)', fontWeight: 700 }}>{budget.name}</h3>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>Limit: <span className="currency">${safeFormat(limit)}</span></div>
              </div>

              <div style={{ fontSize: '1.75rem', fontWeight: 900, margin: '15px 0', color: remaining >= 0 ? 'var(--text)' : 'var(--danger)' }}>
                <span className="currency">${safeFormat(remaining)}</span>
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', marginLeft: '8px' }}>left</span>
              </div>

              <div style={{ marginTop: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.8rem' }}>
                  <span style={{ fontWeight: 600, color: 'var(--text-muted)' }}>Spent: <span className="currency">${safeFormat(spent)}</span></span>
                  <span style={{ fontWeight: 800, color: progress > 90 ? 'var(--danger)' : 'var(--primary)' }}>{progress.toFixed(0)}%</span>
                </div>
                <div style={{ width: '100%', height: '10px', background: 'rgba(255,255,255,0.05)', borderRadius: '5px', overflow: 'hidden' }}>
                  <div style={{ width: `${progress}%`, height: '100%', background: progress > 90 ? 'var(--danger)' : 'var(--primary)', transition: 'width 0.5s cubic-bezier(0.4, 0, 0.2, 1)', boxShadow: progress > 90 ? '0 0 10px rgba(244, 63, 94, 0.3)' : '0 0 10px rgba(16, 185, 129, 0.3)' }}></div>
                </div>
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
          <div className="card">
            <h3 style={{ color: 'var(--text)', marginBottom: '25px', fontWeight: 800 }}>Recent Purchases</h3>
            <div className="table-container">
              <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
                <thead>
                  <tr style={{ textAlign: 'left', fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    <th style={{ padding: '12px 0' }}>Date</th>
                    <th>Vendor / Box</th>
                    <th>Source</th>
                    <th style={{ textAlign: 'right' }}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {(transactions || [])
                    .filter(tx => {
                      if (!tx || !tx.date) return false;
                      const d = new Date(tx.date);
                      return d.getMonth() === currentMonth && d.getFullYear() === currentYear && tx.type === 'expense';
                    })
                    .map(tx => {
                      const acc = accounts.find(a => a.id === tx.account_id);
                      const budget = budgets.find(b => b.id === tx.budget_category_id);
                      return (
                        <tr key={tx.id}>
                          <td style={{ padding: '16px 0', fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>{tx.date ? tx.date.split('T')[0] : ''}</td>
                          <td>
                            <div style={{ fontWeight: 700, color: 'var(--text)', fontSize: '0.95rem' }}>{tx.category}</div>
                            {budget && <div style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 700, marginTop: '4px' }}>📦 {budget.name}</div>}
                          </td>
                          <td style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>{acc?.name || 'Unknown'}</td>
                          <td style={{ textAlign: 'right', fontWeight: 800, fontSize: '1.05rem' }} className="currency negative">
                            -${safeFormat(tx.amount)}
                          </td>
                        </tr>
                      );
                    })
                  }
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>
      <style>{`
        @media (min-width: 1024px) {
          .transactions-page > .grid:last-child {
            grid-template-columns: 1fr 2.5fr !important;
          }
        }
      `}</style>
    </div>
  );
};

export default TransactionsPage;
