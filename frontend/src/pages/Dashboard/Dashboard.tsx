import React, { useState, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import UserGuide from '../../components/UserGuide/UserGuide';

interface DashboardProps {
  accounts: any[];
  taxEstimate: any;
  incomeSources: any[];
  transactions: any[];
  snapshots: any[];
}

const ACCENT_OPTIONS = ['var(--primary)', '#10b981', '#8b5cf6', '#f43f5e', '#f59e0b', '#06b6d4', '#fb7185', '#64748b'];

const Dashboard: React.FC<DashboardProps> = ({ 
  accounts, taxEstimate, incomeSources, transactions, snapshots 
}) => {
  const { isPrivacyMode, isEditMode } = useAuth();
  
  const [boxColors, setBoxColors] = useState<Record<string, string>>(() => {
    const saved = localStorage.getItem('saphyr_dashboard_colors');
    return saved ? JSON.parse(saved) : {};
  });

  const handleColorChange = (id: string, color: string) => {
    const newColors = { ...boxColors, [id]: color };
    setBoxColors(newColors);
    localStorage.setItem('saphyr_dashboard_colors', JSON.stringify(newColors));
  };

  const safeFormat = (val: any) => {
    if (isPrivacyMode) return '••••';
    const num = parseFloat(val || '0');
    return isNaN(num) ? '0.00' : num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const metrics = useMemo(() => {
    const totalCash = (accounts || [])
      .filter(a => !a.is_bill)
      .reduce((sum, a) => sum + parseFloat(a.balance || '0'), 0);

    const monthlyBills = (accounts || [])
      .filter(a => a.is_bill)
      .reduce((sum, a) => sum + Math.abs(parseFloat(a.balance || '0')), 0);

    const totalOtherIncome = (incomeSources || [])
      .reduce((sum, s) => {
        const amt = parseFloat(s.amount);
        const multiplier = s.frequency === 'weekly' ? (52/12) : (s.frequency === 'bi-weekly' ? (26/12) : 1);
        return sum + (amt * multiplier);
      }, 0);

    const monthlyNetPay = parseFloat(taxEstimate?.monthly_net || '0');
    const availableMonthlyCapital = monthlyNetPay + totalOtherIncome - monthlyBills;

    const spentThisMonth = (transactions || [])
      .filter(tx => {
        const d = new Date(tx.date);
        const now = new Date();
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear() && tx.type === 'expense';
      })
      .reduce((sum, tx) => sum + parseFloat(tx.amount || '0'), 0);

    const liquidityPosition = availableMonthlyCapital - spentThisMonth;

    let momentum = 0;
    if (snapshots.length >= 2) {
      momentum = parseFloat(snapshots[snapshots.length - 1].net_worth) - parseFloat(snapshots[snapshots.length - 2].net_worth);
    }

    return { totalCash, availableMonthlyCapital, liquidityPosition, momentum };
  }, [accounts, taxEstimate, incomeSources, transactions, snapshots]);

  const renderColorPicker = (id: string) => (
    isEditMode && (
      <div style={{ position: 'absolute', top: '10px', right: '10px', zIndex: 10, display: 'flex', gap: '4px', background: 'rgba(0,0,0,0.5)', padding: '4px', borderRadius: '20px', border: '1px solid var(--border)' }}>
        {ACCENT_OPTIONS.map(c => (
          <button 
            key={c} 
            onClick={() => handleColorChange(id, c)}
            style={{ width: '12px', height: '12px', borderRadius: '50%', background: c, border: (boxColors[id] || 'var(--primary)') === c ? '1.5px solid white' : 'none', cursor: 'pointer', padding: 0, marginTop: 0 }}
          />
        ))}
      </div>
    )
  );

  return (
    <div className="dashboard-container">
      <UserGuide guideKey="dashboard_v2" title="Command Center">
        <p>Your "Available Liquidity" is the heart of your financial engine. It tracks exactly what you have left after all fixed obligations are met.</p>
      </UserGuide>

      <div className="grid" style={{ gridTemplateColumns: '1fr', gap: '30px' }}>
        
        {/* MAIN CAPITAL GAUGE */}
        <section className="card" style={{ borderLeft: `5px solid ${boxColors['capital'] || 'var(--primary)'}`, background: 'var(--subtle-overlay)', padding: '50px 30px', textAlign: 'center', position: 'relative' }}>
          {renderColorPicker('capital')}
          <label style={{ fontSize: '0.75rem', fontWeight: 900, color: 'var(--text-muted)', letterSpacing: '0.2em' }}>CURRENT AVAILABLE LIQUIDITY</label>
          <div style={{ fontSize: '4.5rem', fontWeight: 900, margin: '20px 0', color: metrics.liquidityPosition >= 0 ? 'var(--text)' : 'var(--danger)' }} className="currency">
            ${safeFormat(metrics.liquidityPosition)}
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '15px', alignItems: 'center' }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 800, color: metrics.momentum >= 0 ? 'var(--success)' : 'var(--danger)', background: 'var(--subtle-overlay)', padding: '6px 16px', borderRadius: '20px', border: '1px solid var(--border)' }}>
              MOMENTUM: {metrics.momentum >= 0 ? '+' : ''}${safeFormat(metrics.momentum)}
            </div>
          </div>
        </section>

        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '25px' }}>
          
          <div className="card dashboard-item-card" style={{ borderLeft: `5px solid ${boxColors['cash'] || '#10b981'}`, position: 'relative' }}>
            {renderColorPicker('cash')}
            <label style={{ fontSize: '0.65rem', fontWeight: 900, color: 'var(--text-muted)' }}>TOTAL LIQUID ASSETS</label>
            <div style={{ fontSize: '2rem', fontWeight: 900, marginTop: '10px' }} className="currency positive">${safeFormat(metrics.totalCash)}</div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '10px' }}>Combined Checking, Savings, and Cash balances.</p>
          </div>

          <div className="card dashboard-item-card" style={{ borderLeft: `5px solid ${boxColors['budget'] || '#8b5cf6'}`, position: 'relative' }}>
            {renderColorPicker('budget')}
            <label style={{ fontSize: '0.65rem', fontWeight: 900, color: 'var(--text-muted)' }}>MONTHLY RUNWAY</label>
            <div style={{ fontSize: '2rem', fontWeight: 900, marginTop: '10px' }}>${safeFormat(metrics.availableMonthlyCapital)}</div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '10px' }}>Estimated capital remaining after all monthly bills.</p>
          </div>

        </div>

        {/* RECENT ACTIVITY TICKER PREVIEW */}
        <section className="card" style={{ padding: '35px', borderLeft: `5px solid ${boxColors['activity'] || 'var(--primary)'}`, position: 'relative' }}>
          {renderColorPicker('activity')}
          <h3 style={{ margin: '0 0 20px 0', fontSize: '1rem', fontWeight: 900, textAlign: 'center' }}>RECENT ACTIVITY</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {transactions.slice(0, 5).map(tx => (
              <div key={tx.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '15px', background: 'var(--subtle-overlay)', borderRadius: '12px', border: '1px solid var(--border)' }}>
                <div>
                  <div style={{ fontWeight: 800, fontSize: '0.9rem' }}>{tx.category}</div>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{tx.date?.split('T')[0]}</div>
                </div>
                <div style={{ fontWeight: 900 }} className={tx.type === 'income' ? 'positive' : 'negative'}>
                  {tx.type === 'income' ? '+' : '-'}${safeFormat(tx.amount)}
                </div>
              </div>
            ))}
            {transactions.length === 0 && <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)', fontSize: '0.8rem', fontStyle: 'italic' }}>No recent activity detected.</div>}
          </div>
        </section>

      </div>

      <style>{`
        .dashboard-container { max-width: 1000px; margin: 0 auto; animation: pageEnter 0.4s ease; }
        .dashboard-item-card { transition: all 0.3s ease; }
        .dashboard-item-card:hover { transform: translateY(-4px); box-shadow: 0 15px 35px -10px rgba(59, 130, 246, 0.15); }
      `}</style>
    </div>
  );
};

export default Dashboard;
