import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import UserGuide from '../../components/UserGuide/UserGuide';
import { useAuth } from '../../context/AuthContext';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface DashboardProps {
  taxEstimate: any;
  accounts: any[];
  transactions: any[];
  incomeSources: any[];
  snapshots?: any[];
}

const ACCENT_OPTIONS = ['var(--primary)', '#10b981', '#8b5cf6', '#f43f5e', '#f59e0b', '#06b6d4', '#fb7185', '#64748b'];

const SortableItem = React.memo((props: { id: string; children: React.ReactNode; isEditMode: boolean; color: string; onColorChange: (id: string, color: string) => void }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: props.id, disabled: !props.isEditMode });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 1000 : 1,
    position: 'relative' as const,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      {props.isEditMode && (
        <div style={{ position: 'absolute', top: '10px', right: '10px', zIndex: 10, display: 'flex', gap: '8px', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: '4px', background: 'rgba(0,0,0,0.5)', padding: '4px', borderRadius: '20px', border: '1px solid var(--border)' }}>
            {ACCENT_OPTIONS.map(c => (
              <button 
                key={c} 
                onClick={() => props.onColorChange(props.id, c)}
                style={{ width: '14px', height: '14px', borderRadius: '50%', background: c, border: props.color === c ? '1.5px solid white' : 'none', cursor: 'pointer', padding: 0, marginTop: 0 }}
              />
            ))}
          </div>
          <div 
            {...listeners} 
            style={{ 
              background: 'var(--primary)', 
              color: 'var(--text)', 
              padding: '4px 8px', 
              borderRadius: '8px', 
              fontSize: '0.6rem', 
              cursor: 'grab',
              fontWeight: 800,
              boxShadow: '0 0 10px var(--primary)'
            }}
          >
            MOVE
          </div>
        </div>
      )}
      {props.children}
    </div>
  );
});

const Dashboard: React.FC<DashboardProps> = ({
  taxEstimate,
  accounts,
  transactions,
  incomeSources,
  snapshots = []
}) => {
  const { isPrivacyMode, togglePrivacyMode, isEditMode } = useAuth();
  const navigate = useNavigate();

  const [boxOrder, setBoxOrder] = useState<string[]>(() => {
    const saved = localStorage.getItem('saphyr_dashboard_order_v2');
    return saved ? JSON.parse(saved) : ['welcome', 'guide', 'capital', 'accounts_overview', 'bills', 'snapshot', 'activity'];
  });

  const [boxColors, setBoxColors] = useState<Record<string, string>>(() => {
    const saved = localStorage.getItem('saphyr_dashboard_colors');
    return saved ? JSON.parse(saved) : {};
  });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (active.id !== over?.id) {
      setBoxOrder((items) => {
        const oldIndex = items.indexOf(active.id as string);
        const newIndex = items.indexOf(over?.id as string);
        const newOrder = arrayMove(items, oldIndex, newIndex);
        localStorage.setItem('saphyr_dashboard_order_v2', JSON.stringify(newOrder));
        return newOrder;
      });
    }
  };

  const handleColorChange = (id: string, color: string) => {
    const newColors = { ...boxColors, [id]: color };
    setBoxColors(newColors);
    localStorage.setItem('saphyr_dashboard_colors', JSON.stringify(newColors));
  };

  // Memoized Calculations
  const metrics = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    const monthlyBills = (accounts || [])
      .filter(acc => acc?.is_bill)
      .reduce((sum, acc) => sum + Math.abs(parseFloat(acc.balance || '0')), 0);

    const totalAdditionalMonthly = (incomeSources || [])
      .reduce((sum, src) => sum + parseFloat(src.amount || '0'), 0);

    const monthlyNetPay = parseFloat(taxEstimate?.monthly_net || '0');
    const startingBudget = monthlyNetPay + totalAdditionalMonthly - monthlyBills;

    const spentThisMonth = (transactions || [])
      .filter(tx => {
        if (!tx || !tx.date) return false;
        const d = new Date(tx.date);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear && tx.type === 'expense';
      })
      .reduce((sum, tx) => sum + parseFloat(tx.amount || '0'), 0);

    const remainingCapital = startingBudget - spentThisMonth;

    const totalCash = (accounts || [])
      .filter(acc => acc && !acc.is_bill && (['Checking', 'Savings', 'Cash Accounts'].includes(acc.type) || acc.group_name === 'Cash Accounts' || parseFloat(acc.balance || '0') > 0))
      .reduce((sum, acc) => sum + parseFloat(acc.balance || '0'), 0);

    const totalDebt = (accounts || [])
      .filter(acc => acc && (acc.is_bill || ['Credit Card', 'Loan'].includes(acc.type) || parseFloat(acc.balance || '0') < 0))
      .reduce((sum, acc) => sum + Math.abs(parseFloat(acc.balance || '0')), 0);

    const liquidAccountsList = (accounts || [])
      .filter(acc => !acc.is_bill && parseFloat(acc.balance) !== 0)
      .sort((a, b) => parseFloat(b.balance) - parseFloat(a.balance));

    const yesterday = snapshots[1] || snapshots[0];
    const yesterdayNetWorth = yesterday ? parseFloat(yesterday.net_worth) : (totalCash - totalDebt);
    const momentum = (totalCash - totalDebt) - yesterdayNetWorth;

    return {
      monthlyBills,
      startingBudget,
      spentThisMonth,
      remainingCapital,
      totalCash,
      totalDebt,
      netWorth: totalCash - totalDebt,
      liquidAccountsList,
      momentum
    };
  }, [accounts, transactions, incomeSources, taxEstimate, snapshots]);

  const billsData = useMemo(() => {
    const now = new Date();
    const today = now.getDate();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const upcoming = (accounts || [])
      .filter(acc => acc?.is_bill && acc?.due_day)
      .map(acc => {
        let targetDate = new Date(currentYear, currentMonth, acc.due_day);
        if (today > acc.due_day) targetDate = new Date(currentYear, currentMonth + 1, acc.due_day);
        const diffTime = targetDate.getTime() - now.getTime();
        const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return { ...acc, daysRemaining };
      })
      .filter(acc => acc.daysRemaining >= 0 && acc.daysRemaining <= 7)
      .sort((a, b) => a.daysRemaining - b.daysRemaining);

    return {
      upcoming,
      urgent: upcoming.filter(b => b.daysRemaining <= 2),
      totalCount: (accounts || []).filter(acc => acc?.is_bill).length
    };
  }, [accounts]);

  const safeFormat = (val: any) => {
    if (isPrivacyMode) return '••••';
    const num = parseFloat(val || '0');
    return isNaN(num) ? '0.00' : num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const renderBox = (id: string) => {
    const { 
      remainingCapital, netWorth, monthlyBills,
      liquidAccountsList, momentum
    } = metrics;
    
    const boxColor = boxColors[id] || 'var(--primary)';

    switch (id) {
      case 'welcome':
        return (accounts || []).length === 0 ? (
          <div className="card" style={{ border: `2px solid ${boxColor}`, background: 'rgba(255,255,255,0.02)', animation: 'pulse 3s infinite', marginBottom: '20px' }}>
            <h2 style={{ color: boxColor, marginBottom: '15px' }}>Welcome to Saphyr</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: boxColor, color: 'var(--text)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900 }}>1</div>
                <div style={{ fontSize: '0.9rem' }}>Set your earnings in the <strong>Income</strong> tab.</div>
              </div>
              <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: boxColor, color: 'var(--text)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900 }}>2</div>
                <div style={{ fontSize: '0.9rem' }}>Add Checking/Savings in <strong>Accounts</strong>.</div>
              </div>
            </div>
          </div>
        ) : null;
      case 'guide':
        return (
          <div style={{ marginBottom: '20px' }}>
            <UserGuide guideKey="dashboard_v2" title="Unified Status">
              <p style={{ fontSize: '0.85rem' }}>Your top-level summary. "Available Capital" represents your truly disposable funds after all monthly obligations and logged spending.</p>
            </UserGuide>
          </div>
        );
      case 'capital':
        return (
          <div className="card highlight dashboard-hero-card" onClick={() => !isEditMode && navigate('/transactions')} style={{ borderLeft: `5px solid ${boxColor}`, cursor: isEditMode ? 'default' : 'pointer', marginBottom: '20px', textAlign: 'center', padding: '50px 20px', position: 'relative' }}>
            {/* Ambient Aura */}
            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '80%', height: '80%', background: boxColor, filter: 'blur(100px)', opacity: 0.08, zIndex: 0, pointerEvents: 'none' }}></div>
            
            <div style={{ position: 'relative', zIndex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', position: 'relative' }}>
                <label style={{ fontSize: '0.85rem', color: 'var(--text)', fontWeight: 900, letterSpacing: '0.15em' }}>Available Capital</label>
                <button onClick={(e) => { e.stopPropagation(); togglePrivacyMode(); }} style={{ position: 'absolute', right: 0, width: 'auto', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', padding: '4px 10px', borderRadius: '20px', fontSize: '0.6rem', fontWeight: 800 }}>{isPrivacyMode ? 'SHOW' : 'HIDE'}</button>
              </div>
              <h2 style={{ fontSize: '3.5rem', margin: '20px 0', fontWeight: 900, letterSpacing: '-0.04em' }} className={`currency ${remainingCapital >= 0 ? 'positive' : 'negative'}`}>${safeFormat(remainingCapital)}</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Unallocated Funds
                </div>
                {momentum !== 0 && (
                  <div style={{ fontSize: '0.7rem', fontWeight: 800, color: momentum > 0 ? 'var(--success)' : 'var(--danger)', background: 'rgba(255,255,255,0.03)', padding: '4px 12px', borderRadius: '20px', border: '1px solid var(--border)' }}>
                    {momentum > 0 ? '▲' : '▼'} ${safeFormat(Math.abs(momentum))} SINCE YESTERDAY
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      case 'accounts_overview':
        return (
          <div className="card dashboard-item-card" onClick={() => !isEditMode && navigate('/accounts')} style={{ borderLeft: `5px solid ${boxColor}`, cursor: isEditMode ? 'default' : 'pointer', marginBottom: '20px' }}>
            <h3 style={{ fontSize: '0.9rem', fontWeight: 900, color: 'var(--text)', marginBottom: '20px', letterSpacing: '0.05em', textAlign: 'center' }}>Accounts Overview</h3>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {liquidAccountsList.slice(0, 4).map((acc, idx) => (
                <div key={acc.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px 0', borderTop: idx === 0 ? 'none' : '1px solid var(--item-divider)' }}>
                  <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>{acc.name}</span>
                  <span style={{ fontWeight: 900, fontSize: '1.1rem' }} className={`currency ${parseFloat(acc.balance) >= 0 ? 'positive' : 'negative'}`}>${safeFormat(acc.balance)}</span>
                </div>
              ))}
              {liquidAccountsList.length === 0 && <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textAlign: 'center', padding: '20px' }}>No active accounts found.</p>}
            </div>
          </div>
        );
      case 'bills':
        return (
          <div className="card dashboard-item-card" onClick={() => !isEditMode && navigate('/bills')} style={{ borderLeft: `5px solid ${boxColor}`, cursor: isEditMode ? 'default' : 'pointer', marginBottom: '20px', textAlign: 'center' }}>
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: '15px', position: 'relative' }}>
              <h3 style={{ margin: 0, color: 'var(--text)', fontWeight: 800 }}>Bills Due</h3>
              <span style={{ position: 'absolute', right: 0, fontSize: '0.65rem', background: boxColor, color: 'var(--text)', padding: '2px 8px', borderRadius: '10px', fontWeight: 800 }}>{billsData.totalCount} TOTAL</span>
            </div>
            {billsData.urgent.length > 0 ? (
              <div style={{ background: 'rgba(255,255,255,0.03)', padding: '15px', borderRadius: '12px', border: `1px solid ${boxColor}`, marginBottom: '10px' }}>
                {billsData.urgent.map(b => (
                  <div key={b.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', fontWeight: 700 }}>
                    <span>{b.name}</span>
                    <span className="currency negative">-${safeFormat(b.balance)}</span>
                  </div>
                ))}
              </div>
            ) : <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '15px 0' }}>No bills due in 48h.</p>}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', borderTop: '1px solid #111827', paddingTop: '15px', marginTop: '5px' }}>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Obligations</span>
              <span style={{ fontWeight: 900, fontSize: '1.25rem', marginTop: '5px' }} className="currency negative">-${safeFormat(monthlyBills)}</span>
            </div>
          </div>
        );
      case 'snapshot':
        return (
          <div className="card dashboard-item-card" onClick={() => !isEditMode && navigate('/accounts')} style={{ borderLeft: `5px solid ${boxColor}`, cursor: isEditMode ? 'default' : 'pointer', marginBottom: '20px', textAlign: 'center' }}>
            <h3 style={{ fontSize: '1rem', marginBottom: '20px', fontWeight: 800, color: 'var(--text)' }}>Technical Snapshot</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--item-divider)', paddingBottom: '15px' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 700 }}>LIQUIDITY</span>
                <span style={{ fontWeight: 900 }} className="currency positive">${safeFormat(metrics.totalCash)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--item-divider)', paddingBottom: '15px' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 700 }}>TOTAL DEBT</span>
                <span style={{ fontWeight: 900 }} className="currency negative">-${safeFormat(metrics.totalDebt)}</span>
              </div>
              <div style={{ marginTop: '5px', padding: '20px', background: 'rgba(255,255,255,0.02)', borderRadius: '16px', border: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 900, fontSize: '0.9rem', color: 'var(--text-muted)' }}>NET WORTH</span>
                <span style={{ fontWeight: 900, fontSize: '1.5rem' }} className={`currency ${netWorth >= 0 ? 'positive' : 'negative'}`}>${safeFormat(netWorth)}</span>
              </div>
            </div>
          </div>
        );
      case 'activity':
        return (
          <div className="card dashboard-item-card" style={{ borderLeft: `5px solid ${boxColor}`, marginBottom: '20px' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text)', marginBottom: '20px', textAlign: 'center' }}>Recent Logs</h3>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {(transactions || []).slice(0, 5).map((tx, idx) => (
                <div key={tx.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px 0', borderTop: idx === 0 ? 'none' : '1px solid var(--item-divider)' }}>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '0.95rem' }}>{tx.category}</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>{tx.date?.split('T')[0]}</div>
                  </div>
                  <span style={{ fontWeight: 900, fontSize: '1rem' }} className={`currency ${tx.type === 'income' ? 'positive' : 'negative'}`}>{tx.type === 'income' ? '+' : '-'}${safeFormat(tx.amount)}</span>
                </div>
              ))}
            </div>
          </div>
        );
      default: return null;
    }
  };

  return (
    <div className="dashboard" style={{ maxWidth: '800px', margin: '0 auto' }}>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={boxOrder} strategy={verticalListSortingStrategy}>
          {boxOrder.map(id => (
            <SortableItem 
              key={id} 
              id={id} 
              isEditMode={isEditMode} 
              color={boxColors[id] || 'var(--primary)'}
              onColorChange={handleColorChange}
            >
              {renderBox(id)}
            </SortableItem>
          ))}
        </SortableContext>
      </DndContext>
      <style>{`
        .dashboard-hero-card:hover { transform: translateY(-2px); box-shadow: 0 10px 40px -10px rgba(59, 130, 246, 0.2); }
        .dashboard-item-card:hover { transform: translateY(-2px); border-color: var(--border) !important; background: rgba(255,255,255,0.02) !important; }
        .dashboard-hero-card, .dashboard-item-card { transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
      `}</style>
    </div>
  );
};

export default Dashboard;
