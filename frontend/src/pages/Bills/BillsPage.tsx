import React, { useState, useMemo } from 'react';
import UserGuide from '../../components/UserGuide/UserGuide';
import BillForm from '../../components/BillForm/BillForm';
import BillSimulator from '../../components/BillSimulator/BillSimulator';
import { deleteAccount } from '../../services/api';
import { getOrdinal } from '../../services/utils';

interface BillsPageProps {
  userId: string;
  accounts: any[];
  loadData: () => void;
}

const BillsPage: React.FC<BillsPageProps> = ({ userId, accounts, loadData }) => {
  const [viewMode, setViewMode] = useState<'table' | 'box'>(() => {
    return (localStorage.getItem('saphyr_bills_view') as 'table' | 'box') || 'table';
  });

  const safeFormat = (val: any) => {
    const num = parseFloat(val || '0');
    return isNaN(num) ? '0.00' : num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const billAccounts = useMemo(() => (accounts || []).filter(acc => acc && acc.is_bill), [accounts]);

  const groupedBills = useMemo(() => {
    return billAccounts.reduce((groups: any, acc: any) => {
      const group = acc.group_name || 'Uncategorized';
      if (!groups[group]) groups[group] = [];
      groups[group].push(acc);
      return groups;
    }, {});
  }, [billAccounts]);

  const groupNames = Object.keys(groupedBills).sort();
  const totalBills = billAccounts.reduce((sum, acc) => sum + Math.abs(parseFloat(acc.balance || '0')), 0);

  // Interest Drag: Estimated monthly interest cost
  // monthly_interest = (balance * apr) / 12
  const totalInterestDrag = billAccounts.reduce((sum, acc) => {
    const apr = parseFloat(acc.apr || '0');
    const balance = Math.abs(parseFloat(acc.balance || '0'));
    if (apr > 0) return sum + (balance * apr / 12);
    return sum;
  }, 0);

  const handleDelete = async (id: string, name: string) => {
    if (window.confirm(`Remove bill "${name}" from budget?`)) {
      try {
        await deleteAccount(id);
        loadData();
      } catch (err) {
        console.error("Delete failed:", err);
      }
    }
  };

  const toggleView = (mode: 'table' | 'box') => {
    setViewMode(mode);
    localStorage.setItem('saphyr_bills_view', mode);
  };

  return (
    <div className="bills-page" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <UserGuide guideKey="bills_v3" title="Obligation Management">
        <p>Your "Net Take-Home" from the Income tab is the foundation. Now, log your recurring obligations to determine your true "Daily Spending Power."</p>
      </UserGuide>

      <div className="grid" style={{ gridTemplateColumns: '1fr', gap: '25px' }}>
        <section style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
          <div className="bills-sidebar-container" style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
            <div className="card" style={{ background: 'var(--card)', borderLeft: '5px solid var(--danger)', padding: '30px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '20px' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--danger)', fontWeight: 800, letterSpacing: '0.05em' }}>TOTAL MONTHLY OBLIGATIONS</label>
                  <h2 style={{ fontSize: '3rem', margin: '15px 0', fontWeight: 900 }} className="currency negative">${safeFormat(totalBills)}</h2>
                </div>
                <div style={{ textAlign: 'right', minWidth: '150px' }}>
                  <label style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 800, letterSpacing: '0.05em' }}>EST. INTEREST DRAG</label>
                  <div style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--warning)', marginTop: '5px' }} className="currency">-${safeFormat(totalInterestDrag)}</div>
                  <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', marginTop: '4px' }}>*Based on APR and Current Balances</div>
                </div>
              </div>
            </div>
            
            <BillSimulator bills={billAccounts} />
            
            <BillForm userId={userId} onBillAdded={loadData} groups={groupNames} />
          </div>
        </section>

        <section style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, fontWeight: 900, fontSize: '1.2rem', letterSpacing: '0.02em' }}>OBLIGATION BREAKDOWN</h3>
            <div style={{ display: 'flex', background: 'rgba(255,255,255,0.05)', padding: '4px', borderRadius: '10px', border: '1px solid var(--border)' }}>
              <button 
                onClick={() => toggleView('table')} 
                style={{ padding: '6px 15px', fontSize: '0.65rem', fontWeight: 800, background: viewMode === 'table' ? 'var(--primary)' : 'transparent', color: viewMode === 'table' ? 'white' : 'var(--text-muted)', boxShadow: 'none', width: 'auto', marginTop: 0 }}
              >TABLE</button>
              <button 
                onClick={() => toggleView('box')} 
                style={{ padding: '6px 15px', fontSize: '0.65rem', fontWeight: 800, background: viewMode === 'box' ? 'var(--primary)' : 'transparent', color: viewMode === 'box' ? 'white' : 'var(--text-muted)', boxShadow: 'none', width: 'auto', marginTop: 0 }}
              >BOXES</button>
            </div>
          </div>

          {groupNames.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '80px 20px', color: 'var(--text-muted)', border: '2px dashed var(--border)' }}>
              <p style={{ fontWeight: 600 }}>No active obligations found. Use the form to add Rent, Utilities, or Loans.</p>
            </div>
          ) : (
            <div className={viewMode === 'box' ? 'grid' : ''} style={viewMode === 'box' ? { gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' } : { display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {groupNames.map(group => {
                const groupBills = groupedBills[group];
                const groupTotal = groupBills.reduce((sum: number, acc: any) => sum + Math.abs(parseFloat(acc.balance || '0')), 0);

                if (viewMode === 'box') {
                  return (
                    <div key={group} className="card" style={{ borderTop: '4px solid var(--danger)', background: 'rgba(255,255,255,0.01)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid var(--border)', paddingBottom: '10px' }}>
                        <h4 style={{ margin: 0, fontSize: '0.85rem', fontWeight: 900, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em' }}>{group}</h4>
                        <span style={{ fontWeight: 900, color: 'var(--danger)', fontSize: '1.1rem' }} className="currency">${safeFormat(groupTotal)}</span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                        {groupBills.map((bill: any) => (
                          <div key={bill.id} style={{ padding: '15px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid var(--border)', position: 'relative', transition: 'transform 0.2s ease' }} className="highlight-hover">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                              <div>
                                <div style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text)' }}>{bill.name}</div>
                                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px', fontWeight: 600 }}>Due: {getOrdinal(bill.due_day)} • {bill.type}</div>
                              </div>
                              <div style={{ textAlign: 'right' }}>
                                <div style={{ fontWeight: 900, fontSize: '1.1rem' }} className="currency negative">${safeFormat(bill.balance)}</div>
                                {bill.apr > 0 && <div style={{ fontSize: '0.65rem', color: 'var(--warning)', fontWeight: 800, marginTop: '2px' }}>{(bill.apr * 100).toFixed(2)}% APR</div>}
                              </div>
                            </div>
                            <button onClick={() => handleDelete(bill.id, bill.name)} style={{ position: 'absolute', top: '-8px', right: '-8px', width: '22px', height: '22px', padding: 0, borderRadius: '50%', background: 'var(--border)', color: 'var(--text-muted)', fontSize: '0.9rem', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', border: 'none' }}>&times;</button>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                }

                return (
                  <div key={group} className="card" style={{ position: 'relative' }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid var(--danger)', paddingBottom: '15px', marginBottom: '20px' }}>
                      <h3 style={{ margin: 0, color: 'var(--danger)', fontWeight: 900, letterSpacing: '0.02em' }}>{group.toUpperCase()}</h3>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '1.5rem', fontWeight: 900 }} className="currency negative">${safeFormat(groupTotal)}</div>
                      </div>
                    </div>
                    
                    <div className="table-container">
                      <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
                        <thead>
                          <tr style={{ textAlign: 'left', fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                            <th style={{ padding: '12px 0' }}>Description</th>
                            <th>Schedule</th>
                            <th style={{ textAlign: 'right' }}>Obligation</th>
                            <th style={{ width: '50px' }}></th>
                          </tr>
                        </thead>
                        <tbody>
                          {groupBills.map((bill: any) => (
                            <tr key={bill.id}>
                              <td style={{ padding: '18px 0' }}>
                                <strong style={{ color: 'var(--text)', fontSize: '1.05rem', fontWeight: 800 }}>{bill.name}</strong>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, marginTop: '2px' }}>
                                  {bill.type} {bill.apr > 0 && <span style={{ color: 'var(--warning)' }}>@ {(bill.apr * 100).toFixed(2)}% APR</span>}
                                  {bill.loan_term > 0 && ` • ${bill.loan_term}mo term`}
                                </div>
                              </td>
                              <td style={{ fontSize: '0.85rem', color: 'var(--text)', fontWeight: 700 }}>
                                {bill.due_day ? `The ${getOrdinal(bill.due_day)}` : '-'}
                              </td>
                              <td style={{ textAlign: 'right', fontWeight: 900, fontSize: '1.15rem' }} className="currency negative">
                                ${safeFormat(bill.balance)}
                              </td>
                              <td style={{ textAlign: 'right' }}>
                                <button 
                                  onClick={() => handleDelete(bill.id, bill.name)}
                                  style={{ padding: '4px 10px', width: 'auto', background: 'none', color: 'var(--text-muted)', fontSize: '1.5rem', cursor: 'pointer', border: 'none', marginTop: 0, boxShadow: 'none' }}
                                >&times;</button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
      <style>{`
        .highlight-hover:hover {
          transform: translateY(-2px);
          border-color: var(--primary) !important;
          background: rgba(255,255,255,0.04) !important;
        }
        @media (min-width: 1024px) {
          .bills-page > .grid {
            grid-template-columns: 1fr 2.5fr !important;
          }
          .bills-sidebar-container {
            position: sticky;
            top: 120px;
            height: fit-content;
          }
        }
      `}</style>
    </div>
  );
};

export default BillsPage;
