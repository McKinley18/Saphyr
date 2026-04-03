import React, { useState, useMemo, useEffect } from 'react';
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
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { motion, AnimatePresence } from 'framer-motion';

interface SortableItemProps {
  id: string;
  children: React.ReactNode;
  isEditMode: boolean;
  isFullWidth?: boolean;
}

const SortableItem: React.FC<SortableItemProps> = ({ id, children, isEditMode, isFullWidth }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id, disabled: !isEditMode });
  const style = { transform: CSS.Transform.toString(transform), transition, zIndex: isDragging ? 100 : 1, position: isDragging ? 'relative' : 'static', opacity: isDragging ? 0.8 : 1, gridColumn: isFullWidth ? '1 / -1' : undefined, height: '100%' } as React.CSSProperties;
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
  loadData: () => void;
  goals?: any[];
}

const ACCENT_OPTIONS = ['#3b82f6', '#10b981', '#8b5cf6', '#f43f5e', '#f59e0b', '#06b6d4', '#fb7185', '#64748b'];

const Dashboard: React.FC<DashboardProps> = ({ 
  accounts, taxEstimate, incomeSources, transactions, snapshots, loadData, goals = []
}) => {
  const { isPrivacyMode, isEditMode } = useAuth();
  const [showWhatIf, setShowWhatIf] = useState(false);
  const [intelIndex, setIntelIndex] = useState(0);
  
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
    const totalCash = (accounts || []).filter(a => !a.is_bill).reduce((sum, a) => sum + parseFloat(a.balance || '0'), 0);
    const monthlyBills = (accounts || []).filter(a => a.is_bill).reduce((sum, a) => sum + Math.abs(parseFloat(a.balance || '0')), 0);
    const totalOtherIncome = (incomeSources || []).reduce((sum, s) => { const amt = parseFloat(s.amount); const multiplier = s.frequency === 'weekly' ? (52/12) : (s.frequency === 'bi-weekly' ? (26/12) : 1); return sum + (amt * multiplier); }, 0);
    const monthlyNetPay = parseFloat(taxEstimate?.monthly_net || '0');
    const availableMonthlyCapital = monthlyNetPay + totalOtherIncome - monthlyBills;
    const spentThisMonth = (transactions || []).filter(tx => { const d = new Date(tx.date); const now = new Date(); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear() && tx.type === 'expense'; }).reduce((sum, tx) => sum + parseFloat(tx.amount || '0'), 0);
    const liquidityPosition = availableMonthlyCapital - spentThisMonth;

    const totalSpent = (transactions || []).filter(tx => tx.type === 'expense').reduce((s, tx) => s + parseFloat(tx.amount || '0'), 0);
    const totalIncome = (transactions || []).filter(tx => tx.type === 'income').reduce((s, tx) => s + parseFloat(tx.amount || '0'), 0) + monthlyNetPay + totalOtherIncome;
    const savingRate = totalIncome > 0 ? Math.max(0, (totalIncome - totalSpent) / totalIncome) : 0;
    const coverageMonths = monthlyBills > 0 ? totalCash / monthlyBills : 12;
    const coverageScore = Math.min(1, coverageMonths / 6); 
    
    let momentum = 0;
    if (snapshots.length >= 2) { momentum = parseFloat(snapshots[snapshots.length - 1].net_worth) - parseFloat(snapshots[snapshots.length - 2].net_worth); }
    const momentumScore = momentum > 0 ? 1 : (momentum === 0 ? 0.5 : 0);
    const billsPaid = (accounts || []).filter(a => a.is_bill && a.is_paid).length;
    const totalBills = (accounts || []).filter(a => a.is_bill).length;
    const billScore = totalBills > 0 ? billsPaid / totalBills : 1;

    const vitalityScore = Math.round((savingRate * 40) + (coverageScore * 30) + (momentumScore * 20) + (billScore * 10));

    const intel: {id: string, text: string, type: string}[] = [];
    if (savingRate > 0.2) intel.push({ id: 'sr', text: `VELOCITY: Your ${Math.round(savingRate*100)}% saving rate is elite. Keep accumulating.`, type: 'velocity' });
    if (coverageMonths > 3) intel.push({ id: 'cv', text: `SECURITY: You have ${Math.round(coverageMonths*30)} days of runway secured in your vault.`, type: 'secure' });
    
    goals.forEach(g => {
      const remaining = parseFloat(g.target_amount) - parseFloat(g.current_amount);
      if (remaining > 0 && momentum > 0) {
        const days = Math.round(remaining / (momentum / 30));
        if (days > 0 && days < 365) intel.push({ id: `goal-${g.id}`, text: `GOAL INTEL: At current momentum, you will hit '${g.name.toUpperCase()}' in ${days} days.`, type: 'velocity' });
      }
    });

    const categories = Array.from(new Set(transactions.map(t => t.category)));
    categories.slice(0, 3).forEach(cat => {
      const spent = transactions.filter(t => t.category === cat && t.type === 'expense').reduce((s, t) => s + parseFloat(t.amount), 0);
      if (spent > 500) intel.push({ id: `alert-${cat}`, text: `ANALYSIS: ${cat.toUpperCase()} spend is a primary capital outflow this period.`, type: 'alert' });
    });

    return { totalCash, availableMonthlyCapital, liquidityPosition, momentum, vitalityScore, intel };
  }, [accounts, taxEstimate, incomeSources, transactions, snapshots, goals]);

  // STABLE INTEL CYCLER
  useEffect(() => {
    const count = metrics.intel.length;
    if (count <= 1) {
      setIntelIndex(0);
      return;
    }
    const interval = setInterval(() => {
      setIntelIndex(prev => (prev + 1) % count);
    }, 6000);
    return () => clearInterval(interval);
  }, [metrics.intel.length]); // Only reset if the count of messages changes

  const generatePDF = () => {
    const doc = new jsPDF() as any;
    doc.setFillColor(0, 0, 0); doc.rect(0, 0, 210, 297, 'F'); doc.setTextColor(59, 130, 246); doc.setFontSize(22); doc.text('SAPHYR | PRIVATE FINANCIAL STATEMENT', 20, 30);
    doc.setTextColor(255, 255, 255); doc.setFontSize(10); doc.text(`GENERATED: ${new Date().toLocaleString()}`, 20, 40);
    doc.autoTable({ startY: 60, head: [['METRIC', 'VALUE']], body: [['VITALITY SCORE', metrics.vitalityScore], ['LIQUID ASSETS', `$${metrics.totalCash.toLocaleString()}`], ['MONTHLY POSITION', `$${metrics.liquidityPosition.toLocaleString()}`], ['MOMENTUM', `$${metrics.momentum.toLocaleString()}`]], theme: 'grid', styles: { fillColor: [20, 20, 20], textColor: [255, 255, 255], lineColor: [40, 40, 40] }, headStyles: { fillColor: [59, 130, 246] } });
    doc.save(`Saphyr_Statement_${new Date().getMonth()+1}_${new Date().getFullYear()}.pdf`);
  };

  const [layoutOrder, setLayoutOrder] = useState<string[]>(() => {
    const saved = localStorage.getItem('saphyr_dashboard_layout');
    const defaultLayout = ['intel', 'vitality', 'capital', 'upcoming', 'cash', 'budget', 'activity'];
    if (!saved) return defaultLayout;
    const parsed = JSON.parse(saved);
    if (!parsed.includes('intel')) parsed.unshift('intel');
    if (!parsed.includes('vitality')) parsed.splice(1, 0, 'vitality');
    return parsed;
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

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));

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

  const renderColorPicker = (id: string, defaultColor: string) => (
    isEditMode && (
      <div style={{ position: 'absolute', top: '10px', right: '10px', zIndex: 10, display: 'flex', gap: '4px', background: 'rgba(0,0,0,0.5)', padding: '4px', borderRadius: '20px', border: '1px solid var(--border)' }}>
        {ACCENT_OPTIONS.map(c => ( <button key={c} onClick={() => handleColorChange(id, c)} style={{ width: '12px', height: '12px', borderRadius: '50%', background: c, border: (boxColors[id] || defaultColor) === c ? '1.5px solid white' : 'none', cursor: 'pointer', padding: 0, marginTop: 0 }} /> ))}
      </div>
    )
  );

  const upcomingBills = useMemo(() => {
    const today = new Date().getDate();
    return accounts.filter(a => a.is_bill && !a.is_paid).filter(a => { const due = a.due_day || 0; const diff = (due - today + 31) % 31; return diff >= 0 && diff <= 7; }).sort((a, b) => ((a.due_day - today + 31) % 31) - ((b.due_day - today + 31) % 31));
  }, [accounts]);

  const handleMarkPaid = async (bill: any) => { try { const { updateAccount } = await import('../../services/api'); await updateAccount(bill.id, { is_paid: true }); loadData(); } catch (err) { console.error("Failed to mark bill as paid:", err); } };

  const blocks = {
    intel: (
      <SortableItem key="intel" id="intel" isEditMode={isEditMode} isFullWidth>
        <section className="card" style={{ borderLeft: `4px solid ${boxColors['intel'] || 'var(--primary)'}`, padding: '18px 30px', background: 'rgba(59, 130, 246, 0.02)', '--local-accent': boxColors['intel'] || 'var(--primary)', minHeight: '65px', display: 'flex', alignItems: 'center' } as any}>
          {renderColorPicker('intel', 'var(--primary)')}
          <div style={{ display: 'flex', gap: '25px', width: '100%', alignItems: 'center' }}>
            <div style={{ fontSize: '0.65rem', fontWeight: 900, color: 'var(--primary)', letterSpacing: '0.15em', flexShrink: 0, borderRight: '1px solid var(--border)', paddingRight: '20px', height: '20px', display: 'flex', alignItems: 'center' }}>INTEL FEED</div>
            <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
              <AnimatePresence mode="wait">
                <motion.div 
                  key={intelIndex}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
                  style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text)', lineHeight: '1.4' }}
                >
                  {metrics.intel.length > 0 ? metrics.intel[intelIndex].text : 'ALL SYSTEMS OPERATIONAL • NO ALERTS DETECTED'}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </section>
      </SortableItem>
    ),
    vitality: (
      <SortableItem key="vitality" id="vitality" isEditMode={isEditMode}>
        <section className="card" style={{ borderTop: `4px solid ${boxColors['vitality'] || 'var(--primary)'}`, borderLeft: `4px solid ${boxColors['vitality'] || 'var(--primary)'}`, padding: '30px', textAlign: 'center', position: 'relative', height: '100%', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', '--local-accent': boxColors['vitality'] || 'var(--primary)' } as any}>
          {renderColorPicker('vitality', 'var(--primary)')}
          <label style={{ fontSize: '0.65rem', fontWeight: 900, color: 'var(--text-muted)', letterSpacing: '0.2em', marginBottom: '20px' }}>VITALITY CORE</label>
          <div className="vitality-orb-container" style={{ position: 'relative', width: '140px', height: '140px', marginBottom: '20px' }}>
            <div className="vitality-orb" style={{ width: '100%', height: '100%', borderRadius: '50%', background: metrics.vitalityScore > 85 ? 'var(--success-gradient)' : (metrics.vitalityScore > 60 ? 'var(--primary-gradient)' : 'var(--danger-gradient)'), filter: `blur(20px) brightness(${0.8 + (metrics.vitalityScore / 200)})`, opacity: 0.6, animation: 'orbPulse 4s ease-in-out infinite' }}></div>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}><div style={{ fontSize: '2.5rem', fontWeight: 900, lineHeight: 1 }}>{metrics.vitalityScore}</div><div style={{ fontSize: '0.6rem', fontWeight: 900, opacity: 0.6 }}>SCORE</div></div>
          </div>
          <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', marginBottom: '15px' }}>{metrics.vitalityScore > 85 ? 'ELITE POSITION' : (metrics.vitalityScore > 60 ? 'STRONG MOMENTUM' : 'SYSTEM ALERT')}</div>
          <div style={{ padding: '15px', background: 'rgba(59, 130, 246, 0.03)', borderRadius: '12px', border: '1px solid var(--border)', textAlign: 'left', width: '100%' }}><div style={{ fontSize: '0.6rem', fontWeight: 900, color: 'var(--primary)', marginBottom: '8px', letterSpacing: '0.1em' }}>CORE INTELLIGENCE BREAKDOWN</div><div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', lineHeight: '1.5' }}>Your score is a weighted aggregate of <strong>Saving Velocity (40%)</strong>, <strong>Liquidity Coverage (30%)</strong>, <strong>Wealth Momentum (20%)</strong>, and <strong>Obligation Health (10%)</strong>.</div></div>
        </section>
      </SortableItem>
    ),
    capital: (
      <SortableItem key="capital" id="capital" isEditMode={isEditMode} isFullWidth>
        <section className="card main-gauge-card" style={{ borderTop: `4px solid ${boxColors['capital'] || '#3b82f6'}`, borderLeft: `4px solid ${boxColors['capital'] || '#3b82f6'}`, background: 'var(--subtle-overlay)', padding: '50px 30px', textAlign: 'center', position: 'relative', height: '100%', boxSizing: 'border-box', '--local-accent': boxColors['capital'] || '#3b82f6' } as any}>
          {renderColorPicker('capital', '#3b82f6')}
          <label style={{ fontSize: '0.75rem', fontWeight: 900, color: 'var(--text-muted)', letterSpacing: '0.2em' }}>CURRENT AVAILABLE LIQUIDITY</label>
          <div style={{ fontSize: 'clamp(2.5rem, 10vw, 4.5rem)', fontWeight: 900, margin: '20px 0', color: metrics.liquidityPosition >= 0 ? 'var(--text)' : 'var(--danger)', overflowWrap: 'break-word', wordBreak: 'break-all' }} className="currency">${safeFormat(metrics.liquidityPosition)}</div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '15px', alignItems: 'center', flexWrap: 'wrap' }}><div style={{ fontSize: '0.8rem', fontWeight: 800, color: metrics.momentum >= 0 ? 'var(--success)' : 'var(--danger)', background: 'var(--subtle-overlay)', padding: '6px 16px', borderRadius: '20px', border: '1px solid var(--border)' }}>MOMENTUM: {metrics.momentum >= 0 ? '+' : ''}${safeFormat(metrics.momentum)}</div></div>
        </section>
      </SortableItem>
    ),
    upcoming: (
      <SortableItem key="upcoming" id="upcoming" isEditMode={isEditMode} isFullWidth>
        <section className="card" style={{ borderTop: `4px solid ${boxColors['upcoming'] || '#f43f5e'}`, borderLeft: `4px solid ${boxColors['upcoming'] || '#f43f5e'}`, padding: '30px', position: 'relative', height: '100%', boxSizing: 'border-box', '--local-accent': boxColors['upcoming'] || '#f43f5e' } as any}>
          {renderColorPicker('upcoming', '#f43f5e')}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}><h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 900, letterSpacing: '0.1em' }}>UPCOMING OBLIGATIONS (7 DAYS)</h3><span style={{ fontSize: '0.65rem', fontWeight: 900, color: 'var(--danger)', background: 'rgba(244, 63, 94, 0.1)', padding: '4px 10px', borderRadius: '20px' }}>{upcomingBills.length} PENDING</span></div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {upcomingBills.map(bill => (
              <div key={bill.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px', background: 'var(--subtle-overlay)', borderRadius: '12px', border: '1px solid var(--border)' }}><div style={{ flex: 1 }}><div style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--text)' }}>{bill.name.toUpperCase()}</div><div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '4px' }}>DUE IN { (bill.due_day - new Date().getDate() + 31) % 31 } DAYS</div></div><div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}><div style={{ fontWeight: 900, fontSize: '1.1rem' }} className="currency negative">${safeFormat(Math.abs(bill.balance))}</div><button onClick={() => handleMarkPaid(bill)} style={{ width: 'auto', padding: '8px 15px', fontSize: '0.65rem', background: 'var(--success-gradient)', color: 'white', borderRadius: '8px', border: 'none', cursor: 'pointer' }}>MARK PAID</button></div></div>
            ))}
            {upcomingBills.length === 0 && <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '0.85rem' }}>All systems clear. No obligations due in the next 7 days.</div>}
          </div>
        </section>
      </SortableItem>
    ),
    cash: (
      <SortableItem key="cash" id="cash" isEditMode={isEditMode}>
        <div className="card dashboard-item-card" style={{ borderTop: `4px solid ${boxColors['cash'] || '#10b981'}`, borderLeft: `4px solid ${boxColors['cash'] || '#10b981'}`, position: 'relative', height: '100%', boxSizing: 'border-box', '--local-accent': boxColors['cash'] || '#10b981' } as any}>
          {renderColorPicker('cash', '#10b981')}
          <label style={{ fontSize: '0.65rem', fontWeight: 900, color: 'var(--text-muted)' }}>TOTAL LIQUID ASSETS</label>
          <div style={{ fontSize: '2rem', fontWeight: 900, marginTop: '10px' }} className="currency positive">${safeFormat(metrics.totalCash)}</div>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '10px' }}>Combined Checking, Savings, and Cash balances.</p>
        </div>
      </SortableItem>
    ),
    budget: (
      <SortableItem key="budget" id="budget" isEditMode={isEditMode}>
        <div className="card dashboard-item-card" style={{ borderTop: `4px solid ${boxColors['budget'] || '#f59e0b'}`, borderLeft: `4px solid ${boxColors['budget'] || '#f59e0b'}`, position: 'relative', height: '100%', boxSizing: 'border-box', '--local-accent': boxColors['budget'] || '#f59e0b' } as any}>
          {renderColorPicker('budget', '#f59e0b')}
          <label style={{ fontSize: '0.65rem', fontWeight: 900, color: 'var(--text-muted)' }}>MONTHLY REMAINING</label>
          <div style={{ fontSize: '2rem', fontWeight: 900, marginTop: '10px' }} className="currency">${safeFormat(metrics.availableMonthlyCapital)}</div>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '10px' }}>Estimated capital remaining after all monthly bills.</p>
        </div>
      </SortableItem>
    ),
    activity: (
      <SortableItem key="activity" id="activity" isEditMode={isEditMode} isFullWidth>
        <section className="card" style={{ padding: '35px', borderTop: `4px solid ${boxColors['activity'] || '#8b5cf6'}`, borderLeft: `4px solid ${boxColors['activity'] || '#8b5cf6'}`, position: 'relative', height: '100%', boxSizing: 'border-box', '--local-accent': boxColors['activity'] || '#8b5cf6' } as any}>
          {renderColorPicker('activity', '#8b5cf6')}
          <h3 style={{ margin: '0 0 20px 0', fontSize: '1rem', fontWeight: 900, textAlign: 'center' }}>RECENT ACTIVITY</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {transactions.slice(0, 5).map(tx => (
              <div key={tx.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '15px', background: 'var(--subtle-overlay)', borderRadius: '12px', border: '1px solid var(--border)' }}>
                <div><div style={{ fontWeight: 800, fontSize: '0.9rem' }}>{tx.category}</div><div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{tx.date?.split('T')[0]}</div></div>
                <div style={{ fontWeight: 900 }} className={`currency ${tx.type === 'income' ? 'positive' : 'negative'}`}>{tx.type === 'income' ? '+' : '-'}${safeFormat(tx.amount)}</div>
              </div>
            ))}
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
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button onClick={() => setShowWhatIf(true)} style={{ marginTop: '10px', background: 'var(--subtle-overlay)', border: '1px solid var(--primary)', color: 'var(--primary)', padding: '6px 12px', fontSize: '0.7rem', fontWeight: 800, borderRadius: '8px', cursor: 'pointer', width: 'auto' }}>SIMULATE SCENARIO</button>
          <button onClick={generatePDF} style={{ marginTop: '10px', background: 'var(--primary-gradient)', color: 'white', padding: '6px 12px', fontSize: '0.7rem', fontWeight: 800, borderRadius: '8px', cursor: 'pointer', border: 'none', width: 'auto' }}>GENERATE STATEMENT</button>
        </div>
      </UserGuide>

      {showWhatIf && <WhatIfEngine currentCash={metrics.totalCash} currentRunway={metrics.availableMonthlyCapital} currentDebt={accounts.filter(a => a.is_bill).reduce((s, a) => s + Math.abs(parseFloat(a.balance || '0')), 0)} monthlyNetIncome={parseFloat(taxEstimate?.monthly_net || '0') + incomeSources.reduce((s, src) => s + parseFloat(src.amount || '0') * (src.frequency === 'weekly' ? 52/12 : (src.frequency === 'bi-weekly' ? 26/12 : 1)), 0)} monthlyFixedObligations={accounts.filter(a => a.is_bill).reduce((s, a) => s + Math.abs(parseFloat(a.balance || '0')), 0)} onClose={() => setShowWhatIf(false)} />}

      {isEditMode && (
        <div className="card glow-primary" style={{ padding: '20px', marginBottom: '30px', background: 'var(--subtle-overlay)' }}>
          <h3 style={{ margin: '0 0 15px 0', fontSize: '0.9rem', fontWeight: 900, textAlign: 'center', letterSpacing: '0.1em' }}>WIDGET GALLERY</h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', justifyContent: 'center' }}>
            {['intel', 'vitality', 'capital', 'upcoming', 'cash', 'budget', 'activity'].map(id => {
              const isHidden = hiddenBlocks.includes(id);
              return <button key={id} onClick={() => toggleBlockVisibility(id)} style={{ padding: '8px 15px', fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', borderRadius: '8px', border: `1px solid ${isHidden ? 'var(--border)' : 'var(--primary)'}`, background: isHidden ? 'transparent' : 'rgba(59, 130, 246, 0.1)', color: isHidden ? 'var(--text-muted)' : 'var(--primary)', cursor: 'pointer', width: 'auto', margin: 0 }}>{id} {isHidden ? '(HIDDEN)' : '(VISIBLE)'}</button>;
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
        .dashboard-container { max-width: 1000px; margin: 0 auto; }
        @keyframes orbPulse { 0% { transform: scale(1); opacity: 0.5; } 50% { transform: scale(1.1); opacity: 0.8; } 100% { transform: scale(1); opacity: 0.5; } }
        @media (max-width: 768px) { .main-gauge-card { padding: 30px 15px !important; } }
      `}</style>
    </div>
  );
};

export default Dashboard;
