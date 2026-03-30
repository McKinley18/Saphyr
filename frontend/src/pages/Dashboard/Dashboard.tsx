import React from 'react';
import UserGuide from '../../components/UserGuide/UserGuide';
import { useAuth } from '../../context/AuthContext';
import { deleteTransaction } from '../../services/api';
import { getOrdinal } from '../../services/utils';

interface DashboardProps {
  taxEstimate: any;
  accounts: any[];
  transactions: any[];
  incomeSources: any[];
  loadData?: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({
  taxEstimate,
  accounts,
  transactions,
  incomeSources,
  loadData
}) => {
  const { isPrivacyMode, togglePrivacyMode } = useAuth();

  // Helper for safe formatting with Privacy Masking
  const safeFormat = (val: any) => {
    if (isPrivacyMode) return '••••';
    const num = parseFloat(val || '0');
    return isNaN(num) ? '0.00' : num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const handleDeleteTx = async (id: string, category: string, amount: number) => {
    if (window.confirm(`Remove transaction: ${category} ($${amount})?`)) {
      await deleteTransaction(id);
      if (loadData) loadData();
    }
  };

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const today = now.getDate();

  const monthlyBills = (accounts || [])
    .filter(acc => acc && acc.is_bill)
    .reduce((sum, acc) => sum + Math.abs(parseFloat(acc.balance || '0')), 0);

  const totalAdditionalMonthly = (incomeSources || [])
    .reduce((sum, src) => sum + parseFloat(src.amount || '0'), 0);

  const monthlyNetPay = parseFloat(taxEstimate?.monthly_net || '0');
  
  // Starting budget is now explicitly Money after Income minus ALL Bills
  const startingBudget = monthlyNetPay + totalAdditionalMonthly - monthlyBills;

  const totalSpentThisMonth = (transactions || [])
    .filter(tx => {
      if (!tx || !tx.date) return false;
      const d = new Date(tx.date);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear && tx.type === 'expense';
    })
    .reduce((sum, tx) => sum + parseFloat(tx.amount || '0'), 0);

  const remainingBudget = startingBudget - totalSpentThisMonth;
  const spendingProgress = startingBudget > 0 ? Math.min(100, (totalSpentThisMonth / startingBudget) * 100) : 0;

  const totalCash = (accounts || [])
    .filter(acc => acc && !acc.is_bill && (['Checking', 'Savings', 'Cash Accounts'].includes(acc.type) || acc.group_name === 'Cash Accounts' || parseFloat(acc.balance || '0') > 0))
    .reduce((sum, acc) => sum + parseFloat(acc.balance || '0'), 0);

  const totalDebt = (accounts || [])
    .filter(acc => acc && (acc.is_bill || ['Credit Card', 'Loan'].includes(acc.type) || parseFloat(acc.balance || '0') < 0))
    .reduce((sum, acc) => sum + Math.abs(parseFloat(acc.balance || '0')), 0);

  const netWorth = totalCash - totalDebt;

  // Upcoming Bills Logic
  const allUpcomingBills = (accounts || [])
    .filter(acc => acc.is_bill && acc.due_day)
    .map(acc => {
      // Target date in current month
      let targetDate = new Date(currentYear, currentMonth, acc.due_day);
      
      // If due date has already passed this month, target next month
      if (today > acc.due_day) {
        targetDate = new Date(currentYear, currentMonth + 1, acc.due_day);
      }
      
      const diffTime = targetDate.getTime() - now.getTime();
      const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      return { ...acc, daysRemaining };
    })
    .filter(acc => acc.daysRemaining >= 0 && acc.daysRemaining <= 7)
    .sort((a, b) => a.daysRemaining - b.daysRemaining);

  const urgentBills = allUpcomingBills.filter(b => b.daysRemaining <= 2);
  
  // All bills for the month summary
  const totalBillCount = (accounts || []).filter(acc => acc.is_bill).length;
  const nextMajorBill = allUpcomingBills[0];

  const isNewUser = (accounts || []).length === 0;

  return (
    <div className="dashboard" style={{ maxWidth: '800px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {isNewUser && (
        <div className="card" style={{ border: '2px solid var(--primary)', background: 'rgba(59, 130, 246, 0.05)', animation: 'pulse 3s infinite' }}>
          <h2 style={{ color: 'var(--primary)', marginBottom: '15px' }}>💎 Welcome to Saphyr!</h2>
          <p style={{ marginBottom: '20px', lineHeight: '1.6' }}>You're one step away from financial clarity. Since your dashboard is fresh, here's how to get set up:</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
              <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900 }}>1</div>
              <div>Go to the <strong>Income</strong> tab to set your 2025 salary.</div>
            </div>
            <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
              <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900 }}>2</div>
              <div>Add your Checking/Savings in the <strong>Accounts</strong> tab.</div>
            </div>
            <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
              <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900 }}>3</div>
              <div>Log your first purchase using the <strong>(+) Button</strong> below!</div>
            </div>
          </div>
        </div>
      )}

      <UserGuide guideKey="dashboard" title="Dashboard">
        <p>Your financial command center. Here's how to read this page:</p>
        <ul style={{ paddingLeft: '20px', marginTop: '10px' }}>
          <li><strong>Monthly Budget Remainder:</strong> This is your "Spending Money" for the month. It's calculated by taking your total income and subtracting all fixed bills and daily purchases.</li>
          <li><strong>Bills & Obligations:</strong> A summary of your recurring debt. It will alert you with a pulsing red box if a bill is due within 48 hours.</li>
          <li><strong>Financial Snapshot:</strong> A high-level view of your total liquidity (Cash) vs. total debt. Your <strong>Net Worth</strong> is the difference between the two.</li>
          <li><strong>Recent Activity:</strong> The last 10 entries you've logged across all accounts.</li>
        </ul>
      </UserGuide>

      {/* 2. Main Budget Remainder */}
      <div className="card highlight" style={{ borderLeft: '5px solid var(--primary)', position: 'relative' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 700 }}>MONTHLY BUDGET REMAINDER (AFTER BILLS)</label>
          <button 
            onClick={togglePrivacyMode}
            style={{ width: 'auto', background: 'none', border: 'none', boxShadow: 'none', padding: 0, marginTop: 0, fontSize: '1.2rem', cursor: 'pointer', opacity: 0.6 }}
            title={isPrivacyMode ? "Show balances" : "Hide balances"}
          >
            {isPrivacyMode ? '👁️' : '🕶️'}
          </button>
        </div>
        <h2 style={{ fontSize: '3rem', margin: '15px 0' }} className={`currency ${remainingBudget >= 0 ? 'positive' : 'negative'}`}>
          ${safeFormat(remainingBudget)}
        </h2>
        
        <div style={{ marginTop: '25px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', fontSize: '0.9rem' }}>
            <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Daily Purchases: <span className="currency">${safeFormat(totalSpentThisMonth)}</span> / <span className="currency">${safeFormat(startingBudget)}</span></span>
            <span style={{ fontWeight: 800 }}>{spendingProgress.toFixed(0)}%</span>
          </div>
          <div style={{ width: '100%', height: '12px', background: 'rgba(255,255,255,0.05)', borderRadius: '6px', overflow: 'hidden' }}>
            <div style={{ width: `${spendingProgress}%`, height: '100%', background: spendingProgress > 90 ? 'var(--danger)' : 'var(--primary)', transition: 'width 0.8s ease-in-out', boxShadow: spendingProgress > 90 ? '0 0 15px rgba(244, 63, 94, 0.3)' : '0 0 15px rgba(59, 130, 246, 0.3)' }}></div>
          </div>
        </div>
      </div>

      {/* 3. Bills & Obligations Summary (PERMANENT BOX) */}
      <div className="card" style={{ borderLeft: '5px solid #8b5cf6' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3 style={{ margin: 0, color: 'var(--text)', fontWeight: 800 }}>Bills & Obligations</h3>
          <span style={{ fontSize: '0.75rem', background: 'rgba(139, 92, 246, 0.1)', color: '#a78bfa', padding: '4px 12px', borderRadius: '20px', fontWeight: 700 }}>{totalBillCount} Total Bills</span>
        </div>

        {urgentBills.length > 0 ? (
          <div style={{ background: 'rgba(244, 63, 94, 0.1)', padding: '15px', borderRadius: '16px', border: '1px solid var(--danger)', animation: 'pulse 2s infinite', marginBottom: '15px' }}>
            <div style={{ fontSize: '0.7rem', color: 'var(--danger)', fontWeight: 800, textTransform: 'uppercase', marginBottom: '5px' }}>🚨 Urgent Action Required</div>
            {urgentBills.map(bill => (
              <div key={bill.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
                <strong style={{ fontSize: '1rem' }}>{bill.name}</strong>
                <span style={{ fontWeight: 900, color: 'var(--danger)' }} className="currency">${safeFormat(bill.balance)}</span>
              </div>
            ))}
          </div>
        ) : nextMajorBill ? (
          <div style={{ background: 'rgba(59, 130, 246, 0.05)', padding: '15px', borderRadius: '16px', border: '1px solid var(--border)', marginBottom: '15px' }}>
            <div style={{ fontSize: '0.7rem', color: 'var(--primary)', fontWeight: 800, textTransform: 'uppercase', marginBottom: '5px' }}>📅 Next Up</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <strong style={{ fontSize: '1rem' }}>{nextMajorBill.name}</strong>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Due in {nextMajorBill.daysRemaining} days ({getOrdinal(nextMajorBill.due_day)})</div>
              </div>
              <span style={{ fontWeight: 900, fontSize: '1.2rem' }} className="currency">${safeFormat(nextMajorBill.balance)}</span>
            </div>
          </div>
        ) : (
          <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem', margin: '20px 0' }}>No upcoming bills detected for the next 30 days.</p>
        )}

        <div className="account-item" style={{ borderBottom: 'none', paddingBottom: 0 }}>
          <span style={{ fontWeight: 600 }}>Monthly Bills Total</span>
          <span style={{ fontWeight: 800, color: 'var(--danger)' }} className="currency">-${safeFormat(monthlyBills)}</span>
        </div>
      </div>


      {/* 4. Financial Snapshot */}
      <div className="card" style={{ borderLeft: '5px solid var(--text-muted)' }}>
        <h3 style={{ fontSize: '1.1rem', marginBottom: '20px', fontWeight: 800, color: 'var(--text)' }}>Financial Snapshot</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
          <div style={{ padding: '18px', background: 'rgba(34, 197, 94, 0.08)', borderRadius: '16px', border: '1px solid rgba(34, 197, 94, 0.1)' }}>
            <label style={{ fontSize: '0.75rem', color: 'var(--success)', fontWeight: 800 }}>TOTAL CASH</label>
            <div style={{ fontSize: '1.6rem', fontWeight: 900 }} className="currency positive">${safeFormat(totalCash)}</div>
          </div>
          <div style={{ padding: '18px', background: 'rgba(244, 63, 94, 0.08)', borderRadius: '16px', border: '1px solid rgba(244, 63, 94, 0.1)' }}>
            <label style={{ fontSize: '0.75rem', color: 'var(--danger)', fontWeight: 800 }}>TOTAL DEBT/BILLS</label>
            <div style={{ fontSize: '1.6rem', fontWeight: 900 }} className="currency negative">${safeFormat(totalDebt)}</div>
          </div>
        </div>
        
        <div className="account-item">
          <span style={{ fontWeight: 600 }}>Net Worth (Cash - Debt)</span>
          <span style={{ fontWeight: 900, fontSize: '1.3rem' }} className={`currency ${netWorth >= 0 ? 'positive' : 'negative'}`}>${safeFormat(netWorth)}</span>
        </div>
        <div className="account-item">
          <span>Total Monthly Inflow</span>
          <span style={{ fontWeight: 700 }} className="currency positive">${safeFormat(monthlyNetPay + totalAdditionalMonthly)}</span>
        </div>
        <div className="account-item">
          <span>Monthly Bills</span>
          <span style={{ fontWeight: 700 }} className="currency negative">-${safeFormat(monthlyBills)}</span>
        </div>
      </div>

      {/* 5. Recent Activity */}
      <div className="card" style={{ borderLeft: '5px solid var(--primary)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: 'var(--text)' }}>Recent Activity</h3>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Latest 10 entries</span>
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          {(transactions || []).slice(0, 10).map(tx => (
            <div key={tx.id} className="transaction-item" style={{ borderBottom: '1px solid var(--border)', padding: '14px 5px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                  <button 
                    onClick={() => handleDeleteTx(tx.id, tx.category, tx.amount)}
                    style={{ width: 'auto', background: 'none', border: 'none', boxShadow: 'none', padding: '5px', marginTop: 0, fontSize: '1rem', cursor: 'pointer', opacity: 0.4 }}
                  >
                    🗑️
                  </button>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '1rem' }}>{tx.category}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 500 }}>{tx.date ? tx.date.split('T')[0] : ''} • {tx.description || 'No description'}</div>
                  </div>
                </div>
                <span className={`currency ${tx.type === 'income' ? 'positive' : 'negative'}`} style={{ fontSize: '1.15rem', fontWeight: 800 }}>
                  {tx.type === 'income' ? '+' : '-'}${safeFormat(tx.amount)}
                </span>
              </div>
            </div>
          ))}
          {(transactions || []).length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
              No transactions logged yet.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
