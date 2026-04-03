import React, { useMemo, useState } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import UserGuide from '../../components/UserGuide/UserGuide';
import { useAuth } from '../../context/AuthContext';
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
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

interface SortableItemProps {
  id: string;
  children: React.ReactNode;
  isEditMode: boolean;
}

const SortableItem: React.FC<SortableItemProps> = ({ id, children, isEditMode }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id, disabled: !isEditMode });
  const style = { transform: CSS.Transform.toString(transform), transition, zIndex: isDragging ? 100 : 1, position: 'relative' as const, opacity: isDragging ? 0.8 : 1 };
  return (
    <div ref={setNodeRef} style={style}>
      {isEditMode && (
        <div {...attributes} {...listeners} style={{ position: 'absolute', top: '15px', left: '15px', cursor: 'grab', zIndex: 20, background: 'rgba(0,0,0,0.5)', padding: '4px 8px', borderRadius: '10px', border: '1px solid var(--border)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>⋮</div>
      )}
      {children}
    </div>
  );
};

interface TrendsPageProps {
  snapshots: any[];
  transactions: any[];
  budgets: any[];
}

const ACCENT_OPTIONS = ['#3b82f6', '#10b981', '#8b5cf6', '#f43f5e', '#f59e0b', '#06b6d4', '#fb7185', '#64748b'];

const TrendsPage: React.FC<TrendsPageProps> = ({ snapshots = [], transactions = [] }) => {
  const { isPrivacyMode, isEditMode } = useAuth();
  
  const [boxColors, setBoxColors] = useState<Record<string, string>>(() => {
    const saved = localStorage.getItem('saphyr_trends_colors_v3');
    return saved ? JSON.parse(saved) : {};
  });

  const [layoutOrder, setLayoutOrder] = useState<string[]>(() => {
    const saved = localStorage.getItem('saphyr_trends_layout');
    return saved ? JSON.parse(saved) : ['specs', 'momentum', 'projections', 'trajectory'];
  });

  const handleColorChange = (id: string, color: string) => {
    const newColors = { ...boxColors, [id]: color };
    setBoxColors(newColors);
    localStorage.setItem('saphyr_trends_colors_v3', JSON.stringify(newColors));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setLayoutOrder((items) => {
        const oldIndex = items.indexOf(active.id as string);
        const newIndex = items.indexOf(over.id as string);
        const newOrder = arrayMove(items, oldIndex, newIndex);
        localStorage.setItem('saphyr_trends_layout', JSON.stringify(newOrder));
        return newOrder;
      });
    }
  };

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));

  const safeFormat = (val: any) => {
    if (isPrivacyMode) return '••••';
    const num = parseFloat(val || '0');
    return isNaN(num) ? '0.00' : num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const renderColorPicker = (id: string, defaultColor: string) => (
    isEditMode && (
      <div style={{ position: 'absolute', top: '10px', right: '10px', zIndex: 10, display: 'flex', gap: '4px', background: 'rgba(0,0,0,0.5)', padding: '4px', borderRadius: '20px', border: '1px solid var(--border)' }}>
        {ACCENT_OPTIONS.map(c => (
          <button key={c} onClick={() => handleColorChange(id, c)} style={{ width: '12px', height: '12px', borderRadius: '50%', background: c, border: (boxColors[id] || defaultColor) === c ? '1.5px solid white' : 'none', cursor: 'pointer', padding: 0, marginTop: 0 }} />
        ))}
      </div>
    )
  );

  const chartData = useMemo(() => {
    if (!snapshots || snapshots.length === 0) return { labels: [], datasets: [] };
    const labels = snapshots.map(s => new Date(s.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }));
    return {
      labels,
      datasets: [
        { label: 'Liquidity', data: snapshots.map(s => parseFloat(s.total_cash || 0)), borderColor: '#3b82f6', backgroundColor: 'rgba(59, 130, 246, 0.1)', fill: 'origin', tension: 0.4, pointRadius: 0, borderWidth: 3 },
        { label: 'Debt', data: snapshots.map(s => parseFloat(s.total_debt || 0)), borderColor: '#ef4444', backgroundColor: 'rgba(239, 68, 68, 0.1)', fill: 'origin', tension: 0.4, pointRadius: 0, borderWidth: 3 },
        { label: 'Net Worth', data: snapshots.map(s => parseFloat(s.net_worth || 0)), borderColor: '#10b981', borderWidth: 2, borderDash: [5, 5], fill: false, tension: 0, pointRadius: 4, pointBackgroundColor: '#10b981' }
      ]
    };
  }, [snapshots]);

  const metrics = useMemo(() => {
    if (!snapshots || snapshots.length < 2) return { delta: 0, savingRate: 0, totalSpent: 0 };
    const latest = snapshots[snapshots.length - 1];
    const previous = snapshots[0];
    const delta = parseFloat(latest.net_worth || 0) - parseFloat(previous.net_worth || 0);
    const totalSpent = transactions.filter(tx => tx.type === 'expense').reduce((sum, tx) => sum + parseFloat(tx.amount || 0), 0);
    const totalIncome = transactions.filter(tx => tx.type === 'income').reduce((sum, tx) => sum + parseFloat(tx.amount || 0), 0);
    const savingRate = totalIncome > 0 ? ((totalIncome - totalSpent) / totalIncome) * 100 : 0;
    return { delta, savingRate, totalSpent };
  }, [snapshots, transactions]);

  const sections = {
    specs: (
      <SortableItem key="specs" id="specs" isEditMode={isEditMode}>
        <div className="card" style={{ display: 'flex', gap: '20px', padding: '15px 25px', borderTop: `4px solid ${boxColors['specs'] || '#3b82f6'}`, borderLeft: `4px solid ${boxColors['specs'] || '#3b82f6'}`, '--local-accent': boxColors['specs'] || '#3b82f6' } as any}>
          {renderColorPicker('specs', '#3b82f6')}
          <div className="spec-gauge" style={{ flex: 1, textAlign: 'center', borderRight: '1px solid var(--item-divider)' }}>
            <label style={{ fontSize: '0.6rem', fontWeight: 900, textTransform: 'uppercase', color: 'var(--text-muted)' }}>NET WORTH DELTA</label>
            <div className={metrics.delta >= 0 ? 'positive' : 'negative'} style={{ fontFamily: 'JetBrains Mono', fontSize: '1.1rem', fontWeight: 900 }}>{metrics.delta >= 0 ? '+' : ''}${safeFormat(metrics.delta)}</div>
          </div>
          <div className="spec-gauge" style={{ flex: 1, textAlign: 'center', borderRight: '1px solid var(--item-divider)' }}>
            <label style={{ fontSize: '0.6rem', fontWeight: 900, textTransform: 'uppercase', color: 'var(--text-muted)' }}>SAVING RATE</label>
            <div style={{ color: 'var(--success)', fontFamily: 'JetBrains Mono', fontSize: '1.1rem', fontWeight: 900 }}>{isPrivacyMode ? '••' : metrics.savingRate.toFixed(1)}%</div>
          </div>
          <div className="spec-gauge" style={{ flex: 1, textAlign: 'center' }}>
            <label style={{ fontSize: '0.6rem', fontWeight: 900, textTransform: 'uppercase', color: 'var(--text-muted)' }}>MONTHLY BURN</label>
            <div style={{ color: 'var(--danger)', fontFamily: 'JetBrains Mono', fontSize: '1.1rem', fontWeight: 900 }}>-${safeFormat(metrics.totalSpent)}</div>
          </div>
        </div>
      </SortableItem>
    ),
    momentum: (
      <SortableItem key="momentum" id="momentum" isEditMode={isEditMode}>
        <section className="card" style={{ padding: '35px', borderTop: `4px solid ${boxColors['momentum'] || '#3b82f6'}`, borderLeft: `4px solid ${boxColors['momentum'] || '#3b82f6'}`, '--local-accent': boxColors['momentum'] || '#3b82f6', height: '500px', display: 'flex', flexDirection: 'column' } as any}>
          {renderColorPicker('momentum', '#3b82f6')}
          <h3 style={{ margin: '0 0 25px 0', fontWeight: 900, fontSize: '1.1rem', textAlign: 'center' }}>WEALTH MOMENTUM</h3>
          <div style={{ flex: 1, width: '100%', position: 'relative' }}>
            {snapshots.length > 1 ? <Line data={chartData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { color: '#94a3b8', font: { weight: '800', size: 10 } } } }, scales: { x: { grid: { display: false }, ticks: { color: '#64748b', font: { weight: '700' } } }, y: { grid: { color: 'rgba(255,255,255,0.03)' }, ticks: { color: '#64748b', font: { weight: '700' } } } } } as any} /> : <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontStyle: 'italic' }}>Awaiting secondary snapshot...</div>}
          </div>
        </section>
      </SortableItem>
    ),
    projections: (
      <SortableItem key="projections" id="projections" isEditMode={isEditMode}>
        <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          <div className="card" style={{ padding: '25px', textAlign: 'center', borderTop: `4px solid ${boxColors['p1'] || '#3b82f6'}`, borderLeft: `4px solid ${boxColors['p1'] || '#3b82f6'}`, '--local-accent': boxColors['p1'] || '#3b82f6' } as any}>
            {renderColorPicker('p1', '#3b82f6')}
            <label style={{ fontSize: '0.6rem', fontWeight: 900, color: 'var(--text-muted)' }}>PROJECTED ASSETS (1YR)</label>
            <div style={{ fontSize: '1.5rem', fontWeight: 900, marginTop: '10px' }} className="currency positive">${safeFormat(parseFloat(snapshots[snapshots.length-1]?.total_cash || 0) + (metrics.delta * 12))}</div>
          </div>
          <div className="card" style={{ padding: '25px', textAlign: 'center', borderTop: `4px solid ${boxColors['p2'] || '#f43f5e'}`, borderLeft: `4px solid ${boxColors['p2'] || '#f43f5e'}`, '--local-accent': boxColors['p2'] || '#f43f5e' } as any}>
            {renderColorPicker('p2', '#f43f5e')}
            <label style={{ fontSize: '0.6rem', fontWeight: 900, color: 'var(--text-muted)' }}>PROJECTED DEBT (1YR)</label>
            <div style={{ fontSize: '1.5rem', fontWeight: 900, marginTop: '10px' }} className="currency negative">${safeFormat(Math.max(0, parseFloat(snapshots[snapshots.length-1]?.total_debt || 0) - (metrics.delta * 12)))}</div>
          </div>
        </div>
      </SortableItem>
    ),
    trajectory: (
      <SortableItem key="trajectory" id="trajectory" isEditMode={isEditMode}>
        <section className="card" style={{ borderTop: `4px solid ${boxColors['traj'] || '#8b5cf6'}`, borderLeft: `4px solid ${boxColors['traj'] || '#8b5cf6'}`, '--local-accent': boxColors['traj'] || '#8b5cf6', padding: '35px' } as any}>
          {renderColorPicker('traj', '#8b5cf6')}
          <h3 style={{ margin: 0, fontWeight: 900, fontSize: '1rem', textAlign: 'center' }}>PREDICTIVE TRAJECTORY</h3>
          <div style={{ marginTop: '30px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div className="card card-condensed" style={{ borderLeft: '4px solid var(--border)' }}><div style={{ fontSize: '0.65rem', fontWeight: 900, color: 'var(--text-muted)', marginBottom: '8px' }}>MONTHLY NET MOMENTUM</div><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><span style={{ fontWeight: 800 }}>Wealth Growth</span><span className="currency positive" style={{ fontWeight: 900 }}>+${safeFormat(metrics.delta)}</span></div></div>
            <div className="card card-condensed" style={{ background: 'rgba(59, 130, 246, 0.02)', borderLeft: '4px solid var(--primary)' }}><div style={{ fontSize: '0.65rem', fontWeight: 900, color: 'var(--primary)', marginBottom: '10px' }}>STRATEGY INSIGHT</div><p style={{ fontSize: '0.85rem', lineHeight: '1.6' }}>At your current <strong>{isPrivacyMode ? '••' : metrics.savingRate.toFixed(1)}%</strong> saving rate, your net worth is projected to increase by <strong>${safeFormat(metrics.delta * 12)}</strong> over the next 12 months.</p></div>
          </div>
        </section>
      </SortableItem>
    )
  };

  return (
    <div className="trends-page">
      <UserGuide guideKey="trends_v2" title="Wealth Momentum">
        <p>Monitor your trajectory. Customze your view and analyze growth with "Architect Mode."</p>
      </UserGuide>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={layoutOrder} strategy={verticalListSortingStrategy}>
          <div className="accounts-grid-layout">
            <div className="workflow-column" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {layoutOrder.filter(id => id !== 'trajectory').map(id => (sections as any)[id])}
            </div>
            <div className="summary-column">
              <div className="sticky-ticker-column">
                {(sections as any)['trajectory']}
              </div>
            </div>
          </div>
        </SortableContext>
      </DndContext>

      <style>{`
        .trends-page { max-width: 1200px; margin: 0 auto; padding: 0 20px; padding-bottom: 100px; }
        .accounts-grid-layout { display: grid; grid-template-columns: 1fr; gap: 40px; }
        @media (min-width: 1024px) { .accounts-grid-layout { grid-template-columns: 1.8fr 1.2fr; } }
        .sticky-ticker-column { position: sticky; top: 100px; }
      `}</style>
    </div>
  );
};

export default TrendsPage;
