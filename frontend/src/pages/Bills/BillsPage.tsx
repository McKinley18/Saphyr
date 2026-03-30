import React from 'react';
import UserGuide from '../../components/UserGuide/UserGuide';
import BillForm from '../../components/BillForm/BillForm';
import { deleteAccount } from '../../services/api';
import { getOrdinal } from '../../services/utils';

interface BillsPageProps {
  userId: string;
  accounts: any[];
  loadData: () => void;
}

const BillsPage: React.FC<BillsPageProps> = ({ userId, accounts, loadData }) => {
  const safeFormat = (val: any) => {
    const num = parseFloat(val || '0');
    return isNaN(num) ? '0.00' : num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const billAccounts = (accounts || []).filter(acc => acc && acc.is_bill);

  const groupedBills = billAccounts.reduce((groups: any, acc: any) => {
    const group = acc.group_name || 'Uncategorized';
    if (!groups[group]) groups[group] = [];
    groups[group].push(acc);
    return groups;
  }, {});

  const groupNames = Object.keys(groupedBills);
  const totalBills = billAccounts.reduce((sum, acc) => sum + Math.abs(parseFloat(acc.balance || '0')), 0);

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

  return (
    <div className="bills-page" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <UserGuide guideKey="bills" title="Bills & Debt">
        <p>Manage your monthly commitments and crush your debt.</p>
        <ul style={{ paddingLeft: '20px', marginTop: '10px' }}>
          <li><strong>Recurring Bills:</strong> Add your Rent, Netflix, Utilities, and Loans here.</li>
          <li><strong>Due Day:</strong> Setting a due day (1-31) triggers automated alerts on your Dashboard when a bill is coming up.</li>
          <li><strong>Debt Avalanche:</strong> For credit cards and loans, enter your **APR %**. We'll show you exactly how much interest you're paying each month.</li>
          <li><strong>Priority Payoff:</strong> Focus on the highest interest rates first to save the most money over time.</li>
        </ul>
      </UserGuide>

      <div className="grid" style={{ gridTemplateColumns: '1fr', gap: '20px' }}>
        <section style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="bills-sidebar-container" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div className="card" style={{ background: 'rgba(244, 63, 94, 0.05)', borderLeft: '5px solid var(--danger)' }}>
              <label style={{ fontSize: '0.8rem', color: 'var(--danger)', fontWeight: 800 }}>TOTAL MONTHLY BILLS</label>
              <h2 style={{ fontSize: '2.5rem', margin: '5px 0', fontWeight: 900 }} className="currency negative">${safeFormat(totalBills)}</h2>
            </div>
            
            <BillForm userId={userId} onBillAdded={loadData} groups={groupNames} />
          </div>
        </section>

        <section style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {groupNames.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
              <p>No bills added yet. Add your recurring payments on the left.</p>
            </div>
          ) : (
            groupNames.map(group => {
              const groupBills = groupedBills[group];
              const groupTotal = groupBills.reduce((sum: number, acc: any) => sum + Math.abs(parseFloat(acc.balance || '0')), 0);

              return (
                <div key={group} className="card" style={{ position: 'relative' }}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid var(--danger)', paddingBottom: '15px', marginBottom: '20px' }}>
                    <h3 style={{ margin: 0, color: 'var(--danger)', fontWeight: 800 }}>{group}</h3>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '1.25rem', fontWeight: 900 }} className="currency negative">${safeFormat(groupTotal)}</div>
                    </div>
                  </div>
                  
                  <div className="table-container">
                    <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
                      <thead>
                        <tr style={{ textAlign: 'left', fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          <th style={{ padding: '12px 0' }}>Bill Name</th>
                          <th>Due Day</th>
                          <th style={{ textAlign: 'right' }}>Amount</th>
                          <th style={{ width: '50px' }}></th>
                        </tr>
                      </thead>
                      <tbody>
                        {groupBills.map((bill: any) => (
                          <tr key={bill.id} style={{ position: 'relative' }}>
                            <td style={{ padding: '16px 0' }}>
                              <strong style={{ color: 'var(--text)', fontSize: '1rem' }}>{bill.name}</strong>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>{bill.type}</div>
                            </td>
                            <td style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                              {bill.due_day ? getOrdinal(bill.due_day) : '-'}
                            </td>
                            <td style={{ textAlign: 'right', fontWeight: 800, fontSize: '1.05rem' }} className="currency negative">
                              ${safeFormat(bill.balance)}
                            </td>
                            <td style={{ textAlign: 'right' }}>
                              <button 
                                onClick={() => handleDelete(bill.id, bill.name)}
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
                              >&times;</button>
                            </td>
                          </tr>
                        ))}
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
          .bills-page > .grid {
            grid-template-columns: 1fr 2fr !important;
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
