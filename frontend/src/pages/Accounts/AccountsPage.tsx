import React, { useState } from 'react';
import UserGuide from '../../components/UserGuide/UserGuide';
import AccountForm from '../../components/AccountForm/AccountForm';
import { deleteAccount, createGoal, updateGoal, deleteGoal } from '../../services/api';

interface AccountsPageProps {
  userId: string;
  accounts: any[];
  goals: any[];
  loadData: () => void;
}

const AccountsPage: React.FC<AccountsPageProps> = ({ userId, accounts, goals, loadData }) => {
  const [showAddGoal, setShowAddGoal] = useState(false);
  const [newGoal, setNewGoal] = useState({ name: '', target: '', current: '' });

  const safeFormat = (val: any) => {
    const num = parseFloat(val || '0');
    return isNaN(num) ? '0.00' : num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const liquidAccounts = (accounts || [])
    .filter(acc => acc && !acc.is_bill);

  const groupedAccounts = liquidAccounts.reduce((groups: any, acc: any) => {
    const group = acc.group_name || 'Uncategorized';
    if (!groups[group]) groups[group] = [];
    groups[group].push(acc);
    return groups;
  }, {});

  const groupNames = Object.keys(groupedAccounts);

  const handleDelete = async (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to remove "${name}"?`)) {
      try {
        await deleteAccount(id);
        loadData();
      } catch (err) {
        console.error("Delete failed:", err);
      }
    }
  };

  const handleCreateGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createGoal({
        user_id: userId,
        name: newGoal.name,
        target_amount: parseFloat(newGoal.target),
        current_amount: parseFloat(newGoal.current) || 0
      });
      setNewGoal({ name: '', target: '', current: '' });
      setShowAddGoal(false);
      loadData();
    } catch (err) {
      console.error("Goal creation failed:", err);
    }
  };

  const handleUpdateGoalProgress = async (id: string, current: number) => {
    const amount = window.prompt("Enter amount to add to this goal:", "0");
    if (amount) {
      try {
        const newTotal = current + parseFloat(amount);
        await updateGoal(id, { current_amount: newTotal });
        loadData();
      } catch (err) {
        console.error("Goal update failed:", err);
      }
    }
  };

  const handleDeleteGoal = async (id: string, name: string) => {
    if (window.confirm(`Delete goal "${name}"?`)) {
      try {
        await deleteGoal(id);
        loadData();
      } catch (err) {
        console.error("Goal delete failed:", err);
      }
    }
  };

  return (
    <div className="accounts-page" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <UserGuide guideKey="accounts" title="Cash Accounts">
        <p>This page is for tracking your liquid assets and specific savings goals.</p>
        <ul style={{ paddingLeft: '20px', marginTop: '10px' }}>
          <li><strong>Liquid Accounts:</strong> Add your Checking, Savings, and physical Cash balances here. Do not add bills or credit cards on this page.</li>
          <li><strong>Savings Envelopes:</strong> Create specific goals (e.g. "Emergency Fund"). Click the progress bar to quickly add money to a goal.</li>
          <li><strong>Goal Progress:</strong> The bars show how close you are to your target. These are "virtual" buckets within your total cash.</li>
        </ul>
      </UserGuide>

      <div className="grid" style={{ gridTemplateColumns: '1fr', gap: '20px' }}>
        <section style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="account-sidebar-container" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <AccountForm userId={userId} onAccountAdded={loadData} groups={groupNames} />
            
            <div className="card" style={{ borderLeft: '5px solid #8b5cf6' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h3 style={{ margin: 0, color: '#a78bfa' }}>Savings Envelopes</h3>
                {!showAddGoal ? (
                  <button onClick={() => setShowAddGoal(true)} style={{ width: 'auto', padding: '8px 16px', fontSize: '0.75rem', background: '#8b5cf6' }}>+ New Goal</button>
                ) : (
                  <button onClick={() => setShowAddGoal(false)} style={{ width: 'auto', padding: '8px 16px', fontSize: '0.75rem', background: 'var(--text-muted)' }}>Cancel</button>
                )}
              </div>

              {showAddGoal && (
                <form onSubmit={handleCreateGoal} style={{ marginBottom: '25px', background: 'rgba(139, 92, 246, 0.05)', padding: '20px', borderRadius: '16px', border: '1px solid rgba(139, 92, 246, 0.1)' }}>
                  <div className="form-group"><label>Goal Name</label><input required value={newGoal.name} onChange={e => setNewGoal({...newGoal, name: e.target.value})} /></div>
                  <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                    <div className="form-group"><label>Target ($)</label><input required type="number" value={newGoal.target} onChange={e => setNewGoal({...newGoal, target: e.target.value})} /></div>
                    <div className="form-group"><label>Starting ($)</label><input type="number" value={newGoal.current} onChange={e => setNewGoal({...newGoal, current: e.target.value})} /></div>
                  </div>
                  <button type="submit" style={{ background: '#8b5cf6' }}>Create Goal</button>
                </form>
              )}

              {(!goals || goals.length === 0) ? (
                <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem', fontStyle: 'italic', padding: '20px 0' }}>No savings goals set yet.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
                  {goals.map(goal => {
                    if (!goal) return null;
                    const progress = Math.min(100, (parseFloat(goal.current_amount || '0') / parseFloat(goal.target_amount || '1')) * 100);
                    return (
                      <div key={goal.id} style={{ position: 'relative' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.9rem' }}>
                          <strong style={{ color: 'var(--text)' }}>{goal.name}</strong>
                          <button onClick={() => handleDeleteGoal(goal.id, goal.name)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', width: 'auto', padding: 0, marginTop: 0, boxShadow: 'none' }}>&times;</button>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '8px' }}>
                          <span><span className="currency">${safeFormat(goal.current_amount)}</span> / <span className="currency">${safeFormat(goal.target_amount)}</span></span>
                          <span style={{ fontWeight: 700, color: progress > 80 ? 'var(--success)' : '#a78bfa' }}>{progress.toFixed(0)}%</span>
                        </div>
                        <div style={{ width: '100%', height: '10px', background: 'rgba(255,255,255,0.05)', borderRadius: '5px', overflow: 'hidden', cursor: 'pointer' }} onClick={() => handleUpdateGoalProgress(goal.id, parseFloat(goal.current_amount || '0'))}>
                          <div style={{ width: `${progress}%`, height: '100%', background: progress > 80 ? 'var(--success)' : '#8b5cf6', transition: 'width 0.6s cubic-bezier(0.4, 0, 0.2, 1)', boxShadow: `0 0 15px ${progress > 80 ? 'rgba(34, 197, 94, 0.3)' : 'rgba(139, 92, 246, 0.3)'}` }}></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </section>

        <section style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {groupNames.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
              <p>No liquid accounts added yet. Add your Checking and Savings accounts on the left.</p>
            </div>
          ) : (
            groupNames.map(group => {
              const groupAccounts = groupedAccounts[group] || [];
              const totalBalance = groupAccounts.reduce((sum: number, acc: any) => sum + parseFloat(acc.balance || '0'), 0);

              return (
                <div key={group} className="card" style={{ position: 'relative' }}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid var(--primary)', paddingBottom: '15px', marginBottom: '20px' }}>
                    <h3 style={{ margin: 0, color: 'var(--primary)', fontWeight: 800 }}>{group}</h3>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '1.25rem', fontWeight: 900 }} className={`currency ${totalBalance >= 0 ? 'positive' : 'negative'}`}>${safeFormat(totalBalance)}</div>
                    </div>
                  </div>
                  
                  <div className="table-container">
                    <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
                      <thead>
                        <tr style={{ textAlign: 'left', fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          <th style={{ padding: '12px 0' }}>Account Name</th>
                          <th>Type</th>
                          <th style={{ textAlign: 'right' }}>Balance</th>
                          <th style={{ width: '50px' }}></th>
                        </tr>
                      </thead>
                      <tbody>
                        {groupAccounts.map((acc: any) => {
                          if (!acc) return null;
                          return (
                            <tr key={acc.id} style={{ position: 'relative' }}>
                              <td style={{ padding: '16px 0' }}>
                                <strong style={{ color: 'var(--text)', fontSize: '1rem' }}>{acc.name}</strong>
                              </td>
                              <td style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>{acc.type}</td>
                              <td style={{ textAlign: 'right', fontWeight: 800, fontSize: '1.05rem' }} className={`currency ${parseFloat(acc.balance) >= 0 ? 'positive' : 'negative'}`}>
                                ${safeFormat(acc.balance)}
                              </td>
                              <td style={{ textAlign: 'right' }}>
                                <button 
                                  onClick={() => handleDelete(acc.id, acc.name)}
                                  style={{ 
                                    padding: '4px 10px', 
                                    width: 'auto', 
                                    background: 'none', 
                                    color: 'var(--text-muted)', 
                                    fontSize: '1.4rem', 
                                    cursor: 'pointer', 
                                    border: 'none',
                                    marginTop: 0,
                                    boxShadow: 'none'
                                  }}
                                  title="Delete"
                                >
                                  &times;
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })
          )}
        </section>
      </div>
      <style>{`
        @media (min-width: 1024px) {
          .accounts-page > .grid {
            grid-template-columns: 1fr 2fr !important;
          }
          .account-sidebar-container {
            position: sticky;
            top: 120px;
            height: fit-content;
          }
        }
      `}</style>
    </div>
  );
};

export default AccountsPage;
