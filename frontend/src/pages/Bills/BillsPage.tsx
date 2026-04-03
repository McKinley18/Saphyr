import React, { useState } from 'react';
import UserGuide from '../../components/UserGuide/UserGuide';
import { deleteAccount, updateAccount } from '../../services/api';
import BillForm from '../../components/BillForm/BillForm';
import BillSimulator from '../../components/BillSimulator/BillSimulator';
import { useAuth } from '../../context/AuthContext';
import { useModal } from '../../context/ModalContext';
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

interface BillsPageProps {
  userId: string;
  accounts: any[];
  loadData: () => void;
}

const ACCENT_OPTIONS = ['#3b82f6', '#10b981', '#8b5cf6', '#f43f5e', '#f59e0b', '#06b6d4', '#fb7185', '#64748b'];

const BillsPage: React.FC<BillsPageProps> = ({ userId, accounts, loadData }) => {
  const { isPrivacyMode, isEditMode } = useAuth();
  const { confirm } = useModal();
  const [viewMode] = useState<'table' | 'box'>('box');
  const [activeTab, setActiveTab] = useState<'tracker' | 'simulator'>('tracker');

  const [boxColors, setBoxColors] = useState<Record<string, string>>(() => {
    const saved = localStorage.getItem('saphyr_bills_colors_v3');
    return saved ? JSON.parse(saved) : {};
  });

  const [layoutOrder, setLayoutOrder] = useState<string[]>(() => {
    const saved = localStorage.getItem('saphyr_bills_layout');
    return saved ? JSON.parse(saved) : ['banner', 'architect', 'obligations'];
  });

  const handleColorChange = (id: string, color: string) => {
    const newColors = { ...boxColors, [id]: color };
    setBoxColors(newColors);
    localStorage.setItem('saphyr_bills_colors_v3', JSON.stringify(newColors));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setLayoutOrder((items) => {
        const oldIndex = items.indexOf(active.id as string);
        const newIndex = items.indexOf(over.id as string);
        const newOrder = arrayMove(items, oldIndex, newIndex);
        localStorage.setItem('saphyr_bills_layout', JSON.stringify(newOrder));
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

  const bills = (accounts || []).filter(acc => acc.is_bill);
  const totalMonthlyBills = bills.reduce((sum, b) => sum + Math.abs(parseFloat(b.balance || '0')), 0);
  const billGroups = Array.from(new Set(bills.map(b => b.group_name).filter(Boolean))) as string[];

  const handleDeleteBill = async (id: string, name: string) => {
    const isConfirmed = await confirm({ title: 'Delete Obligation', message: `Are you sure you want to remove the "${name}" obligation?`, confirmLabel: 'DELETE OBLIGATION', isDanger: true });
    if (isConfirmed) { try { await deleteAccount(id); loadData(); } catch (err) { console.error(err); } }
  };

  const handleTogglePaid = async (bill: any) => {
    try {
      await updateAccount(bill.id, { is_paid: !bill.is_paid });
      loadData();
    } catch (err) { console.error(err); }
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

  const getOrdinal = (n: number) => {
    const s = ["th", "st", "nd", "rd"];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  };

  const sections = {
    banner: (
      <SortableItem key="banner" id="banner" isEditMode={isEditMode}>
        <div className="card" style={{ display: 'flex', flexWrap: 'wrap', gap: '40px', marginBottom: '40px', background: 'rgba(59, 130, 246, 0.04)', border: `1px solid ${boxColors['banner'] || '#3b82f6'}`, padding: '30px 40px', boxSizing: 'border-box', justifyContent: 'space-around', alignItems: 'center', '--local-accent': boxColors['banner'] || '#3b82f6' } as any}>
          {renderColorPicker('banner', '#3b82f6')}
          <div style={{ textAlign: 'center' }}>
            <label style={{ fontSize: '0.6rem', color: 'var(--text-muted)', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: '8px', display: 'block' }}>MONTHLY BILLS</label>
            <div style={{ color: 'var(--danger)', fontFamily: "'JetBrains Mono', monospace", fontSize: '1.8rem', fontWeight: 900 }}>${safeFormat(totalMonthlyBills)}</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <label style={{ fontSize: '0.6rem', color: 'var(--text-muted)', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: '8px', display: 'block' }}>TOTAL OBLIGATIONS</label>
            <div style={{ color: 'var(--text)', fontFamily: "'JetBrains Mono', monospace", fontSize: '1.8rem', fontWeight: 900 }}>{bills.length}</div>
          </div>
        </div>
      </SortableItem>
    ),
    architect: (
      <SortableItem key="architect" id="architect" isEditMode={isEditMode}>
        <div className="card" style={{ position: 'relative', marginBottom: '40px', borderTop: `4px solid ${boxColors['log'] || '#3b82f6'}`, borderLeft: `4px solid ${boxColors['log'] || '#3b82f6'}`, padding: '45px', '--local-accent': boxColors['log'] || '#3b82f6' } as any}>
          {renderColorPicker('log', '#3b82f6')}
          <div style={{ fontSize: '1rem', fontWeight: 900, color: boxColors['log'] || 'var(--primary)', textAlign: 'center', marginBottom: '40px', letterSpacing: '0.2em', textTransform: 'uppercase' }}>
            Add Payment
          </div>
          <BillForm onBillAdded={loadData} userId={userId} groups={billGroups} customColor={boxColors['log'] || '#3b82f6'} />
        </div>
      </SortableItem>
    ),
    obligations: (
      <SortableItem key="obligations" id="obligations" isEditMode={isEditMode}>
        <div className="grid" style={{ gridTemplateColumns: viewMode === 'box' ? 'repeat(auto-fill, minmax(280px, 1fr))' : '1fr', gap: '20px' }}>
          {bills.map(bill => {
            const bColor = boxColors[bill.id] || '#f43f5e';
            return (
              <div key={bill.id} className="card card-condensed" style={{ borderTop: `4px solid ${bColor}`, borderLeft: `4px solid ${bColor}`, position: 'relative', opacity: bill.is_paid ? 0.6 : 1, '--local-accent': bColor } as any}>
                {renderColorPicker(bill.id, '#f43f5e')}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <h4 style={{ margin: 0, fontSize: '0.85rem', fontWeight: 900, color: 'var(--text-muted)' }}>{bill.name.toUpperCase()}</h4>
                  <div style={{ display: 'flex', gap: '0px', alignItems: 'center' }}>
                    <button onClick={() => handleDeleteBill(bill.id, bill.name)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.1rem', width: 'auto', padding: '2px' }}>&times;</button>
                  </div>
                </div>
                <div style={{ fontSize: '1.5rem', fontWeight: 900, margin: '5px 0' }}>${safeFormat(Math.abs(bill.balance))}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' }}>
                  <span style={{ fontSize: '0.6rem', fontWeight: 800, color: 'var(--text-muted)' }}>DUE: {getOrdinal(bill.due_day || 0)}</span>
                  <button onClick={() => handleTogglePaid(bill)} style={{ width: 'auto', padding: '6px 15px', fontSize: '0.65rem', background: bill.is_paid ? 'var(--success-gradient)' : 'var(--subtle-overlay)', color: bill.is_paid ? 'white' : 'var(--text)' }}>{bill.is_paid ? 'PAID' : 'MARK PAID'}</button>
                </div>
              </div>
            );
          })}
        </div>
      </SortableItem>
    )
  };

  return (
    <div className="bills-page">
      <UserGuide guideKey="bills_v2" title="Obligation Command Deck">
        <p>Manage your fixed monthly costs. Rearrange your view and customize colors using "Architect Mode."</p>
      </UserGuide>

      <div className="mode-switcher-v2" style={{ display: 'flex', gap: '15px', marginBottom: '30px' }}>
        <button onClick={() => setActiveTab('tracker')} style={{ flex: 1, background: activeTab === 'tracker' ? 'var(--primary-gradient)' : 'var(--subtle-overlay)', color: activeTab === 'tracker' ? 'white' : 'var(--text-muted)', height: '50px' }}>OBLIGATION TRACKER</button>
        <button onClick={() => setActiveTab('simulator')} style={{ flex: 1, background: activeTab === 'simulator' ? 'var(--primary-gradient)' : 'var(--subtle-overlay)', color: activeTab === 'simulator' ? 'white' : 'var(--text-muted)', height: '50px' }}>LOAN SIMULATOR</button>
      </div>

      {activeTab === 'tracker' ? (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={layoutOrder} strategy={verticalListSortingStrategy}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {layoutOrder.map(id => (sections as any)[id])}
            </div>
          </SortableContext>
        </DndContext>
      ) : (
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <section className="card" style={{ padding: '35px', borderTop: '4px solid var(--primary)', borderLeft: '4px solid var(--primary)', '--local-accent': '#3b82f6' } as any}>
            <BillSimulator bills={bills} />
          </section>
        </div>
      )}

      <style>{`
        .bills-page { max-width: 1200px; margin: 0 auto; padding: 0 20px; padding-bottom: 100px; }
      `}</style>
    </div>
  );
};

export default BillsPage;
