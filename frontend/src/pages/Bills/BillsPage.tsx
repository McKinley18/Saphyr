import React, { useState, useMemo } from 'react';
import UserGuide from '../../components/UserGuide/UserGuide';
import BillForm from '../../components/BillForm/BillForm';
import BillSimulator from '../../components/BillSimulator/BillSimulator';
import { deleteAccount } from '../../services/api';
import { getOrdinal } from '../../services/utils';
import { useModal } from '../../context/ModalContext';
import { useAuth } from '../../context/AuthContext';

interface BillsPageProps {
  userId: string;
  accounts: any[];
  loadData: () => void;
  taxEstimate: any;
  incomeSources: any[];
}

const ACCENT_OPTIONS = ['var(--primary)', '#10b981', '#8b5cf6', '#f43f5e', '#f59e0b', '#06b6d4', '#fb7185', '#64748b'];

const BillsPage: React.FC<BillsPageProps> = ({ userId, accounts, loadData, taxEstimate, incomeSources }) => {
  const { confirm } = useModal();
  const { isEditMode } = useAuth();
  
  const [viewMode, setViewMode] = useState<'table' | 'box'>(() => {
    return (localStorage.getItem('saphyr_bills_view') as 'table' | 'box') || 'table';
  });

  const [boxColors, setBoxColors] = useState<Record<string, string>>(() => {
    const saved = localStorage.getItem('saphyr_bills_colors');
    return saved ? JSON.parse(saved) : {};
  });

  const handleColorChange = (id: string, color: string) => {
    const newColors = { ...boxColors, [id]: color };
    setBoxColors(newColors);
    localStorage.setItem('saphyr_bills_colors', JSON.stringify(newColors));
  };

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

  const totalInterestDrag = billAccounts.reduce((sum, acc) => {
    const apr = parseFloat(acc.apr || '0');
    const balance = Math.abs(parseFloat(acc.balance || '0'));
    if (apr > 0) return sum + (balance * apr / 12);
    return sum;
  }, 0);

  const healthMetrics = useMemo(() => {
    const monthlyNet = parseFloat(taxEstimate?.monthly_net || 0);
    const totalOtherIncome = (incomeSources || []).reduce((sum, s) => {
      const amt = parseFloat(s.amount);
      const multiplier = s.frequency === 'weekly' ? (52/12) : (s.frequency === 'bi-weekly' ? (26/12) : 1);
      return sum + (amt * multiplier);
    }, 0);
    const totalInflow = monthlyNet + totalOtherIncome;
    const dti = totalInflow > 0 ? (totalBills / totalInflow) * 100 : 0;
    
    const nonEssentialBills = billAccounts
      .filter(b => b.type !== 'Rent' && b.type !== 'Mortgage')
      .sort((a, b) => Math.abs(parseFloat(a.balance)) - Math.abs(parseFloat(b.balance)));
    
    const nextSnowballTarget = nonEssentialBills[0];

    return { totalInflow, dti, isHighRisk: dti > 50, nextSnowballTarget };
  }, [taxEstimate, incomeSources, totalBills, billAccounts]);

  const upcomingTimeline = useMemo(() => {
    const today = new Date().getDate();
    return billAccounts
      .filter(b => b.due_day && Math.abs(b.due_day - today) <= 7)
      .sort((a, b) => a.due_day - b.due_day);
  }, [billAccounts]);

  const handleDelete = async (id: string, name: string) => {
    const isConfirmed = await confirm({ title: 'Remove Obligation', message: `Are you sure you want to remove "${name}"?`, confirmLabel: 'REMOVE BILL', isDanger: true });
    if (isConfirmed) { try { await deleteAccount(id); loadData(); } catch (err) { console.error(err); } }
  };

  const toggleView = (mode: 'table' | 'box') => {
    setViewMode(mode);
    localStorage.setItem('saphyr_bills_view', mode);
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
    <div className="bills-page">
      <UserGuide guideKey="bills_v4" title="Obligation Management">
        <p>Step 1: Map your recurring liabilities. Step 2: Analyze debt-to-income ratios. Step 3: Execute payoff simulations.</p>
      </UserGuide>

      <div className="tech-specs-bar" style={{ marginBottom: '40px', padding: '10px 25px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', width: '100%' }}>
          <div style={{ flexShrink: 0, fontSize: '0.65rem', fontWeight: 900, color: 'var(--primary)', letterSpacing: '0.1em', width: '100px', textAlign: 'center' }}>UPCOMING<br/>DUE DATES</div>
          <div style={{ display: 'flex', gap: '15px', overflowX: 'auto', scrollbarWidth: 'none', padding: '5px 0' }}>
            {upcomingTimeline.map(bill => {
              const isDueToday = bill.due_day === new Date().getDate();
              return (
                <div key={bill.id} className={isDueToday ? 'today-pulse' : ''} style={{ background: isDueToday ? 'rgba(59, 130, 246, 0.1)' : 'rgba(255,255,255,0.02)', border: `1px solid ${isDueToday ? 'var(--primary)' : 'var(--border)'}`, borderRadius: '10px', padding: '8px 15px', minWidth: '120px', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.6rem', color: isDueToday ? 'var(--primary)' : 'var(--text-muted)', fontWeight: 800 }}>{isDueToday ? 'DUE TODAY' : `THE ${getOrdinal(bill.due_day)}`}</div>
                  <div style={{ fontSize: '0.8rem', fontWeight: 800, marginTop: '2px', whiteSpace: 'nowrap' }}>{bill.name}</div>
                </div>
              );
            })}
            {upcomingTimeline.length === 0 && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>No obligations due in the next 7 days.</div>}
          </div>
        </div>
      </div>

      <div className="accounts-grid-layout">
        <div className="workflow-column">
          <section className="card" style={{ borderLeft: `5px solid ${boxColors['health'] || 'var(--primary)'}`, background: 'rgba(255,255,255,0.01)', marginBottom: '30px', position: 'relative', padding: '35px' }}>
            {renderColorPicker('health')}
            <h3 style={{ margin: 0, fontWeight: 900, fontSize: '1rem', textAlign: 'center', color: 'var(--text)' }}>OBLIGATION HEALTH</h3>
            <div style={{ marginTop: '20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              <div style={{ textAlign: 'center' }}>
                <label style={{ fontSize: '0.6rem', color: 'var(--text-muted)', fontWeight: 900 }}>DEBT-TO-INCOME</label>
                <div style={{ fontSize: '1.5rem', fontWeight: 900, color: healthMetrics.dti > 40 ? 'var(--danger)' : 'var(--success)' }}>{healthMetrics.dti.toFixed(1)}%</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <label style={{ fontSize: '0.6rem', color: 'var(--text-muted)', fontWeight: 900 }}>MONTHLY INTEREST</label>
                <div style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--warning)' }}>-${safeFormat(totalInterestDrag)}</div>
              </div>
            </div>
            {healthMetrics.nextSnowballTarget && (
              <div style={{ marginTop: '20px', padding: '15px', background: 'rgba(59, 130, 246, 0.05)', borderRadius: '12px', border: '1px solid var(--primary)', textAlign: 'center' }}>
                <div style={{ fontSize: '0.65rem', fontWeight: 900, color: 'var(--primary)', letterSpacing: '0.1em', marginBottom: '5px' }}>SNOWBALL PAYOFF INSIGHT</div>
                <div style={{ fontSize: '0.85rem', fontWeight: 700 }}>Eliminate <span style={{ color: 'var(--primary)' }}>{healthMetrics.nextSnowballTarget.name}</span> to free up <span className="currency positive">${safeFormat(healthMetrics.nextSnowballTarget.balance)}</span> monthly.</div>
              </div>
            )}
          </section>

          <BillSimulator bills={billAccounts} customColor={boxColors['simulator']} renderColorPicker={() => renderColorPicker('simulator')} />
          <div style={{ marginTop: '30px' }}>
            <BillForm userId={userId} onBillAdded={loadData} groups={groupNames} customColor={boxColors['form']} renderColorPicker={() => renderColorPicker('form')} />
          </div>
        </div>

        <div className="summary-column">
          <div className="sticky-ticker-column">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, fontWeight: 900, fontSize: '1.1rem', color: 'var(--text)' }}>OBLIGATION TICKER</h3>
              <div style={{ display: 'flex', background: 'rgba(255,255,255,0.05)', padding: '3px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                <button onClick={() => toggleView('table')} style={{ padding: '4px 10px', fontSize: '0.6rem', background: viewMode === 'table' ? 'var(--primary)' : 'transparent', border: 'none', borderRadius: '6px', color: 'white', cursor: 'pointer', boxShadow: 'none', width: 'auto', marginTop: 0 }}>TAB</button>
                <button onClick={() => toggleView('box')} style={{ padding: '4px 10px', fontSize: '0.6rem', background: viewMode === 'box' ? 'var(--primary)' : 'transparent', border: 'none', borderRadius: '6px', color: 'white', cursor: 'pointer', boxShadow: 'none', width: 'auto', marginTop: 0 }}>BOX</button>
              </div>
            </div>
            <div className="card" style={{ borderLeft: '5px solid var(--danger)', padding: '20px', marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)' }}>TOTAL MONTHLY</span>
                <span style={{ fontWeight: 900, fontSize: '1.2rem', color: 'var(--danger)' }}>-${safeFormat(totalBills)}</span>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              {groupNames.map(group => {
                const bills = groupedBills[group];
                const groupTotal = bills.reduce((sum: number, b: any) => sum + Math.abs(parseFloat(b.balance)), 0);
                return (
                  <div key={group}>
                    <div style={{ fontSize: '0.65rem', fontWeight: 900, color: 'var(--text-muted)', marginBottom: '8px', paddingLeft: '5px', display: 'flex', justifyContent: 'space-between' }}><span>{group.toUpperCase()}</span><span>-${safeFormat(groupTotal)}</span></div>
                    {bills.map((bill: any) => {
                      const isDebt = bill.type === 'Loan' || bill.type === 'Credit Card';
                      return (
                        <div key={bill.id} className="ticker-item card" style={{ padding: '15px', marginBottom: '8px', borderLeft: `3px solid ${isDebt ? 'var(--danger)' : 'var(--primary)'}` }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <div style={{ fontWeight: 800, fontSize: '0.9rem' }}>{bill.name}</div>
                                <span style={{ fontSize: '0.55rem', fontWeight: 900, background: isDebt ? 'rgba(239, 68, 68, 0.1)' : 'rgba(59, 130, 246, 0.1)', color: isDebt ? 'var(--danger)' : 'var(--primary)', padding: '2px 6px', borderRadius: '4px', letterSpacing: '0.05em' }}>{isDebt ? 'DEBT' : 'FIXED'}</span>
                              </div>
                              <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '4px' }}>Date: {getOrdinal(bill.due_day)} • {bill.type}</div>
                            </div>
                            <div style={{ textAlign: 'right' }}><div style={{ fontWeight: 900, fontSize: '1rem', color: 'var(--danger)' }}>-${safeFormat(bill.balance)}</div><button onClick={() => handleDelete(bill.id, bill.name)} className="remove-btn-minimal" style={{ marginTop: '5px' }}>&times;</button></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
      <style>{`
        .bills-page { max-width: 1200px; margin: 0 auto; padding: 0 20px; box-sizing: border-box; }
        .accounts-grid-layout { display: grid; grid-template-columns: 1fr; gap: 40px; width: 100%; box-sizing: border-box; padding-bottom: 100px; }
        @media (min-width: 1024px) { .accounts-grid-layout { grid-template-columns: minmax(0, 1.8fr) minmax(380px, 1.2fr); align-items: start; } }
        .workflow-column { display: flex; flex-direction: column; width: 100%; box-sizing: border-box; }
        .sticky-ticker-column { position: sticky; top: 100px; max-height: calc(100vh - 150px); overflow-y: auto; scrollbar-width: none; }
        .ticker-item { border: 2px solid var(--border) !important; background: var(--bg); transition: all 0.2s ease; }
        .ticker-item:hover { transform: translateX(-4px); border-color: var(--primary) !important; }
        .remove-btn-minimal { background: none; border: none; color: var(--text-muted); cursor: pointer; padding: 0; width: auto; box-shadow: none; font-size: 1.2rem; }
        @keyframes todayPulse { 0% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.4); } 70% { box-shadow: 0 0 0 10px rgba(59, 130, 246, 0); } 100% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0); } }
        .today-pulse { animation: todayPulse 2s infinite; }
      `}</style>
    </div>
  );
};

export default BillsPage;
