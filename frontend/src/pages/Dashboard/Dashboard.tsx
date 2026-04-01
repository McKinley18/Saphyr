import React, { useState, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import UserGuide from '../../components/UserGuide/UserGuide';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors
} from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import WhatIfEngine from '../../components/WhatIfEngine/WhatIfEngine';

interface SortableItemProps {
  id: string;
  children: React.ReactNode;
  isEditMode: boolean;
  isFullWidth?: boolean;
}

const SortableItem: React.FC<SortableItemProps> = ({ id, children, isEditMode, isFullWidth }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, disabled: !isEditMode });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 100 : 1,
    position: isDragging ? 'relative' : 'static',
    opacity: isDragging ? 0.8 : 1,
    gridColumn: isFullWidth ? '1 / -1' : undefined,
    height: '100%',
  } as React.CSSProperties;

  return (
    <div ref={setNodeRef} style={style}>
      {isEditMode && (
        <div {...attributes} {...listeners} style={{ position: 'absolute', top: '10px', left: '10px', cursor: 'grab', zIndex: 20, background: 'rgba(0,0,0,0.5)', padding: '4px 8px', borderRadius: '12px', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
           <span style={{ color: 'white', fontSize: '1rem', lineHeight: 1 }}>&#8942;</span>
        </div>
      )}
      {children}
    </div>
  );
};

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
  const [showWhatIf, setShowWhatIf] = useState(false);
  
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

  const [layoutOrder, setLayoutOrder] = useState<string[]>(() => {
    const saved = localStorage.getItem('saphyr_dashboard_layout');
    return saved ? JSON.parse(saved) : ['capital', 'cash', 'budget', 'activity'];
  });

  const [hiddenBlocks, setHiddenBlocks] = useState<string[]>(() => {
    const saved = localStorage.getItem('saphyr_dashboard_hidden');
    return saved ? JSON.parse(saved) : [];
  });

  const toggleBlockVisibility = (id: string) => {
    setHiddenBlocks(prev => {
      const newHidden = prev.includes(id) ? prev.filter(b => b !== id) : [...prev, id];
      localStorage.setItem('saphyr_dashboard_hidden', JSON.stringify(newHidden));
      return newHidden;
    });
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setLayoutOrder((items) => {
        const oldIndex = items.indexOf(active.id as string);
        const newIndex = items.indexOf(over.id as string);
        const newOrder = arrayMove(items, oldIndex, newIndex);
        localStorage.setItem('saphyr_dashboard_layout', JSON.stringify(newOrder));
        return newOrder;
      });
    }
  };

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

  // Anomaly Detection Engine
  const anomalies = useMemo(() => {
    const categoryAverages: Record<string, { sum: number; count: number; avg: number }> = {};
    
    // Build historical averages
    transactions.forEach(tx => {
      if (tx.type === 'expense') {
        const cat = tx.category.toLowerCase();
        if (!categoryAverages[cat]) categoryAverages[cat] = { sum: 0, count: 0, avg: 0 };
        categoryAverages[cat].sum += parseFloat(tx.amount || '0');
        categoryAverages[cat].count += 1;
      }
    });

    for (const cat in categoryAverages) {
      categoryAverages[cat].avg = categoryAverages[cat].sum / categoryAverages[cat].count;
    }

    // Find anomalies in the most recent 10 transactions
    const detected = new Set<string>();
    transactions.slice(0, 10).forEach(tx => {
      if (tx.type === 'expense') {
        const cat = tx.category.toLowerCase();
        const amt = parseFloat(tx.amount || '0');
        const avg = categoryAverages[cat]?.avg || 0;
        
        // Flag if expense is > 50% larger than historical average, and at least $20
        if (categoryAverages[cat]?.count > 2 && amt > 20 && amt > (avg * 1.5)) {
          detected.add(tx.id);
        }
      }
    });

    return detected;
  }, [transactions]);

  const blocks = {
    capital: (
      <SortableItem key="capital" id="capital" isEditMode={isEditMode} isFullWidth>
        <section className="card main-gauge-card" style={{ borderTop: `4px solid ${boxColors['capital'] || 'var(--primary)'}`, borderLeft: `5px solid ${boxColors['capital'] || 'var(--primary)'}`, background: 'var(--subtle-overlay)', padding: '50px 30px', textAlign: 'center', position: 'relative', height: '100%', boxSizing: 'border-box' }}>
          {renderColorPicker('capital')}
          <label style={{ fontSize: '0.75rem', fontWeight: 900, color: 'var(--text-muted)', letterSpacing: '0.2em' }}>CURRENT AVAILABLE LIQUIDITY</label>
          <div style={{ fontSize: 'clamp(2.5rem, 10vw, 4.5rem)', fontWeight: 900, margin: '20px 0', color: metrics.liquidityPosition >= 0 ? 'var(--text)' : 'var(--danger)', overflowWrap: 'break-word', wordBreak: 'break-all' }} className="currency">
            ${safeFormat(metrics.liquidityPosition)}
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '15px', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 800, color: metrics.momentum >= 0 ? 'var(--success)' : 'var(--danger)', background: 'var(--subtle-overlay)', padding: '6px 16px', borderRadius: '20px', border: '1px solid var(--border)' }}>
              MOMENTUM: {metrics.momentum >= 0 ? '+' : ''}${safeFormat(metrics.momentum)}
            </div>
          </div>
        </section>
      </SortableItem>
    ),
    cash: (
      <SortableItem key="cash" id="cash" isEditMode={isEditMode}>
        <div className="card dashboard-item-card" style={{ borderTop: `4px solid ${boxColors['cash'] || 'var(--primary)'}`, borderLeft: `5px solid ${boxColors['cash'] || 'var(--primary)'}`, position: 'relative', height: '100%', boxSizing: 'border-box' }}>
          {renderColorPicker('cash')}
          <label style={{ fontSize: '0.65rem', fontWeight: 900, color: 'var(--text-muted)' }}>TOTAL LIQUID ASSETS</label>
          <div style={{ fontSize: '2rem', fontWeight: 900, marginTop: '10px' }} className="currency positive">${safeFormat(metrics.totalCash)}</div>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '10px' }}>Combined Checking, Savings, and Cash balances.</p>
        </div>
      </SortableItem>
    ),
    budget: (
      <SortableItem key="budget" id="budget" isEditMode={isEditMode}>
        <div className="card dashboard-item-card" style={{ borderTop: `4px solid ${boxColors['budget'] || 'var(--primary)'}`, borderLeft: `5px solid ${boxColors['budget'] || 'var(--primary)'}`, position: 'relative', height: '100%', boxSizing: 'border-box' }}>
          {renderColorPicker('budget')}
          <label style={{ fontSize: '0.65rem', fontWeight: 900, color: 'var(--text-muted)' }}>MONTHLY REMAINING</label>
          <div style={{ fontSize: '2rem', fontWeight: 900, marginTop: '10px' }}>${safeFormat(metrics.availableMonthlyCapital)}</div>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '10px' }}>Estimated capital remaining after all monthly bills.</p>
        </div>
      </SortableItem>
    ),
    activity: (
      <SortableItem key="activity" id="activity" isEditMode={isEditMode} isFullWidth>
        <section className="card" style={{ padding: '35px', borderTop: `4px solid ${boxColors['activity'] || 'var(--primary)'}`, borderLeft: `5px solid ${boxColors['activity'] || 'var(--primary)'}`, position: 'relative', height: '100%', boxSizing: 'border-box' }}>
          {renderColorPicker('activity')}
          <h3 style={{ margin: '0 0 20px 0', fontSize: '1rem', fontWeight: 900, textAlign: 'center' }}>RECENT ACTIVITY</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {transactions.slice(0, 5).map(tx => {
              const isAnomaly = anomalies.has(tx.id);
              return (
              <div key={tx.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '15px', background: 'var(--subtle-overlay)', borderRadius: '12px', border: isAnomaly ? '1px solid var(--danger)' : '1px solid var(--border)' }}>
                <div>
                  <div style={{ fontWeight: 800, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {tx.category}
                    {isAnomaly && <span style={{ fontSize: '0.5rem', background: 'var(--danger-gradient)', color: 'white', padding: '2px 6px', borderRadius: '4px', letterSpacing: '0.1em' }}>ANOMALY</span>}
                  </div>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{tx.date?.split('T')[0]}</div>
                </div>
                <div style={{ fontWeight: 900 }} className={tx.type === 'income' ? 'positive' : 'negative'}>
                  {tx.type === 'income' ? '+' : '-'}${safeFormat(tx.amount)}
                </div>
              </div>
            )})}
            {transactions.length === 0 && <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)', fontSize: '0.8rem', fontStyle: 'italic' }}>No recent activity detected.</div>}
          </div>
        </section>
      </SortableItem>
    )
  };

  return (
    <div className="dashboard-container">
      <UserGuide guideKey="dashboard_v2" title="Command Center">
        <p>Your "Available Liquidity" is the heart of your financial engine. It tracks exactly what you have left after all fixed obligations are met.</p>
        <button onClick={() => setShowWhatIf(true)} style={{ marginTop: '10px', background: 'var(--subtle-overlay)', border: '1px solid var(--primary)', color: 'var(--primary)', padding: '6px 12px', fontSize: '0.7rem', fontWeight: 800, borderRadius: '8px', cursor: 'pointer' }}>SIMULATE SCENARIO</button>
      </UserGuide>

      {showWhatIf && (
        <WhatIfEngine
          currentCash={metrics.totalCash}
          currentRunway={metrics.availableMonthlyCapital}
          currentDebt={accounts.filter(a => a.is_bill).reduce((s, a) => s + Math.abs(parseFloat(a.balance || '0')), 0)}
          monthlyNetIncome={parseFloat(taxEstimate?.monthly_net || '0') + incomeSources.reduce((s, src) => s + parseFloat(src.amount || '0') * (src.frequency === 'weekly' ? 52/12 : (src.frequency === 'bi-weekly' ? 26/12 : 1)), 0)}
          monthlyFixedObligations={accounts.filter(a => a.is_bill).reduce((s, a) => s + Math.abs(parseFloat(a.balance || '0')), 0)}
          onClose={() => setShowWhatIf(false)}
        />
      )}

      {isEditMode && (
        <div className="card glow-primary" style={{ padding: '20px', marginBottom: '30px', background: 'var(--subtle-overlay)' }}>
          <h3 style={{ margin: '0 0 15px 0', fontSize: '0.9rem', fontWeight: 900, textAlign: 'center', letterSpacing: '0.1em' }}>WIDGET GALLERY</h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', justifyContent: 'center' }}>
            {['capital', 'cash', 'budget', 'activity'].map(id => {
              const isHidden = hiddenBlocks.includes(id);
              return (
                <button
                  key={id}
                  onClick={() => toggleBlockVisibility(id)}
                  style={{
                    padding: '8px 15px',
                    fontSize: '0.7rem',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    borderRadius: '8px',
                    border: `1px solid ${isHidden ? 'var(--border)' : 'var(--primary)'}`,
                    background: isHidden ? 'transparent' : 'rgba(59, 130, 246, 0.1)',
                    color: isHidden ? 'var(--text-muted)' : 'var(--primary)',
                    cursor: 'pointer',
                    width: 'auto',
                    margin: 0
                  }}
                >
                  {id} {isHidden ? '(HIDDEN)' : '(VISIBLE)'}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={layoutOrder.filter(id => !hiddenBlocks.includes(id))} strategy={rectSortingStrategy}>
          <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '30px' }}>
            {layoutOrder.filter(id => !hiddenBlocks.includes(id)).map(id => blocks[id as keyof typeof blocks])}
          </div>
        </SortableContext>
      </DndContext>

      <style>{`
        .dashboard-container { max-width: 1000px; margin: 0 auto; animation: pageEnter 0.4s ease; }
        .dashboard-item-card { transition: all 0.3s ease; }
        .dashboard-item-card:hover { transform: translateY(-4px); box-shadow: 0 15px 35px -10px rgba(59, 130, 246, 0.25); }
        
        @media (max-width: 768px) {
          .main-gauge-card { 
            padding: 30px 15px !important; 
          }
          .main-gauge-card .currency {
            margin: 10px 0 !important;
          }
        }
      `}</style>
    </div>
  );
};

export default Dashboard;
