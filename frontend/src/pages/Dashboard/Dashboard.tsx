import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import UserGuide from '../../components/UserGuide/UserGuide';
import { useAuth } from '../../context/AuthContext';
import { deleteTransaction } from '../../services/api';
import { getOrdinal } from '../../services/utils';
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
  loadData?: () => void;
}

const SortableItem = React.memo((props: { id: string; children: React.ReactNode; isEditMode: boolean }) => {
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
        <div 
          {...listeners} 
          style={{ 
            position: 'absolute', 
            top: '10px', 
            right: '10px', 
            background: 'var(--primary)', 
            color: 'white', 
            padding: '4px 8px', 
            borderRadius: '8px', 
            fontSize: '0.7rem', 
            cursor: 'grab',
            zIndex: 10,
            fontWeight: 800,
            boxShadow: '0 0 10px var(--primary)'
          }}
        >
          DRAG TO MOVE
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
  loadData
}) => {
  const { isPrivacyMode, togglePrivacyMode, isEditMode } = useAuth();
  const navigate = useNavigate();

  const [boxOrder, setBoxOrder] = useState<string[]>(() => {
    const saved = localStorage.getItem('saphyr_dashboard_order');
    return saved ? JSON.parse(saved) : ['welcome', 'guide', 'budget', 'bills', 'snapshot', 'activity'];
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
        localStorage.setItem('saphyr_dashboard_order', JSON.stringify(newOrder));
        return newOrder;
      });
    }
  };

  // Memoized Calculations
  const metrics = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const today = now.getDate();
    const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const daysRemaining = lastDayOfMonth - today + 1;

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

    const remainingBudget = startingBudget - spentThisMonth;
    const dailyPower = Math.max(0, remainingBudget / daysRemaining);

    const totalCash = (accounts || [])
      .filter(acc => acc && !acc.is_bill && (['Checking', 'Savings', 'Cash Accounts'].includes(acc.type) || acc.group_name === 'Cash Accounts' || parseFloat(acc.balance || '0') > 0))
      .reduce((sum, acc) => sum + parseFloat(acc.balance || '0'), 0);

    const totalDebt = (accounts || [])
      .filter(acc => acc && (acc.is_bill || ['Credit Card', 'Loan'].includes(acc.type) || parseFloat(acc.balance || '0') < 0))
      .reduce((sum, acc) => sum + Math.abs(parseFloat(acc.balance || '0')), 0);

    return {
      today,
      lastDayOfMonth,
      monthlyBills,
      startingBudget,
      spentThisMonth,
      remainingBudget,
      dailyPower,
      totalCash,
      totalDebt,
      netWorth: totalCash - totalDebt,
      monthlyInflow: monthlyNetPay + totalAdditionalMonthly
    };
  }, [accounts, transactions, incomeSources, taxEstimate]);

  // Upcoming Bills (Memoized)
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
      remainingBudget, dailyPower, spentThisMonth, startingBudget, 
      totalCash, totalDebt, netWorth, monthlyInflow, monthlyBills,
      today, lastDayOfMonth 
    } = metrics;

    switch (id) {
      case 'welcome':
        return (accounts || []).length === 0 ? (
          <div className="card" style={{ border: '2px solid var(--primary)', background: 'rgba(59, 130, 246, 0.05)', animation: 'pulse 3s infinite', marginBottom: '20px' }}>
            <h2 style={{ color: 'var(--primary)', marginBottom: '15px' }}>Welcome to Saphyr</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900 }}>1</div>
                <div style={{ fontSize: '0.9rem' }}>Set your earnings in the <strong>Income</strong> tab.</div>
              </div>
              <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900 }}>2</div>
                <div style={{ fontSize: '0.9rem' }}>Add Checking/Savings in <strong>Accounts</strong>.</div>
              </div>
            </div>
          </div>
        ) : null;
      case 'guide':
        return (
          <div style={{ marginBottom: '20px' }}>
            <UserGuide guideKey="dashboard" title="Dashboard Summary">
              <p style={{ fontSize: '0.85rem' }}>Your unified financial view. Subscriptions and Bills are subtracted automatically to show your true "Daily Spending Power."</p>
            </UserGuide>
          </div>
        );
      case 'budget':
        const spendingProgress = startingBudget > 0 ? Math.min(100, (spentThisMonth / startingBudget) * 100) : 0;
        return (
          <div className="card highlight" onClick={() => !isEditMode && navigate('/transactions')} style={{ borderLeft: '5px solid var(--primary)', cursor: isEditMode ? 'default' : 'pointer', marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 800, letterSpacing: '0.05em' }}>MONTHLY REMAINDER</label>
              <button onClick={(e) => { e.stopPropagation(); togglePrivacyMode(); }} style={{ width: 'auto', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', padding: '4px 10px', borderRadius: '20px', fontSize: '0.6rem', fontWeight: 800 }}>{isPrivacyMode ? 'SHOW' : 'HIDE'}</button>
            </div>
            <h2 style={{ fontSize: '3rem', margin: '15px 0', fontWeight: 900 }} className={`currency ${remainingBudget >= 0 ? 'positive' : 'negative'}`}>${safeFormat(remainingBudget)}</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div style={{ padding: '12px', background: remainingBudget >= 0 ? 'rgba(34, 197, 94, 0.05)' : 'rgba(244, 63, 94, 0.05)', borderRadius: '12px', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', fontWeight: 800 }}>DAILY POWER</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 900 }} className="currency positive">${safeFormat(dailyPower)}</div>
              </div>
              <div style={{ padding: '12px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', fontWeight: 800 }}>MONTH PROGRESS</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 900 }}>{((today / lastDayOfMonth) * 100).toFixed(0)}%</div>
              </div>
            </div>
            <div style={{ marginTop: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.8rem', fontWeight: 700 }}>
                <span>Spent: <span className="currency">${safeFormat(spentThisMonth)}</span></span>
                <span>{spendingProgress.toFixed(0)}%</span>
              </div>
              <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ width: `${spendingProgress}%`, height: '100%', background: 'var(--primary)', transition: 'width 1s ease' }}></div>
              </div>
            </div>
          </div>
        );
      case 'bills':
        return (
          <div className="card" onClick={() => !isEditMode && navigate('/bills')} style={{ borderLeft: '5px solid #8b5cf6', cursor: isEditMode ? 'default' : 'pointer', marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
              <h3 style={{ margin: 0, color: 'var(--text)', fontWeight: 800 }}>Bills Due</h3>
              <span style={{ fontSize: '0.65rem', background: '#8b5cf6', color: 'white', padding: '2px 8px', borderRadius: '10px', fontWeight: 800 }}>{billsData.totalCount} TOTAL</span>
            </div>
            {billsData.urgent.length > 0 ? (
              <div style={{ background: 'rgba(244, 63, 94, 0.1)', padding: '12px', borderRadius: '12px', border: '1px solid var(--danger)', marginBottom: '10px' }}>
                {billsData.urgent.map(b => (
                  <div key={b.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', fontWeight: 700 }}>
                    <span>{b.name}</span>
                    <span className="currency negative">-${safeFormat(b.balance)}</span>
                  </div>
                ))}
              </div>
            ) : <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textAlign: 'center', margin: '10px 0' }}>No bills due in 48h.</p>}
            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border)', paddingTop: '10px', fontSize: '0.85rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>Total Obligations</span>
              <span style={{ fontWeight: 800 }} className="currency">-${safeFormat(monthlyBills)}</span>
            </div>
          </div>
        );
      case 'snapshot':
        return (
          <div className="card" onClick={() => !isEditMode && navigate('/accounts')} style={{ borderLeft: '5px solid var(--text-muted)', cursor: isEditMode ? 'default' : 'pointer', marginBottom: '20px' }}>
            <h3 style={{ fontSize: '1rem', marginBottom: '15px', fontWeight: 800, color: 'var(--text)' }}>Technical Snapshot</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Total Liquidity</span>
                <span style={{ fontWeight: 800 }} className="currency positive">${safeFormat(totalCash)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Total Debt</span>
                <span style={{ fontWeight: 800 }} className="currency negative">-${safeFormat(totalDebt)}</span>
              </div>
              <div style={{ marginTop: '5px', padding: '12px', background: 'var(--bg)', borderRadius: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 800, fontSize: '0.9rem' }}>NET WORTH</span>
                <span style={{ fontWeight: 900, fontSize: '1.2rem' }} className={`currency ${netWorth >= 0 ? 'positive' : 'negative'}`}>${safeFormat(netWorth)}</span>
              </div>
            </div>
          </div>
        );
      case 'activity':
        return (
          <div className="card" style={{ borderLeft: '5px solid var(--primary)', marginBottom: '20px' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text)', marginBottom: '15px' }}>Recent Logs</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {(transactions || []).slice(0, 5).map(tx => (
                <div key={tx.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem' }}>
                  <div>
                    <div style={{ fontWeight: 700 }}>{tx.category}</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{tx.date?.split('T')[0]}</div>
                  </div>
                  <span style={{ fontWeight: 800 }} className={`currency ${tx.type === 'income' ? 'positive' : 'negative'}`}>{tx.type === 'income' ? '+' : '-'}${safeFormat(tx.amount)}</span>
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
          {boxOrder.map(id => <SortableItem key={id} id={id} isEditMode={isEditMode}>{renderBox(id)}</SortableItem>)}
        </SortableContext>
      </DndContext>
    </div>
  );
};

export default Dashboard;
