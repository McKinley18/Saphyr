import React, { useState, useMemo } from 'react';
import UserGuide from '../../components/UserGuide/UserGuide';
import { createBudget, deleteBudget, deleteTransaction } from '../../services/api';
import TransactionForm from '../../components/TransactionForm/TransactionForm';
import CsvImport from '../../components/CsvImport/CsvImport';
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

interface TransactionsPageProps {
  userId: string;
  accounts: any[];
  transactions: any[];
  budgets: any[];
  taxEstimate: any;
  incomeSources: any[];
  loadData: () => void;
}

const ACCENT_OPTIONS = ['#3b82f6', '#10b981', '#8b5cf6', '#f43f5e', '#f59e0b', '#06b6d4', '#fb7185', '#64748b'];

const TransactionsPage: React.FC<TransactionsPageProps> = ({ 
  userId, accounts, transactions, budgets, taxEstimate, incomeSources, loadData 
}) => {
  const { isPrivacyMode, isEditMode } = useAuth();
  const { confirm } = useModal();
  const [showAddBudget, setShowAddBudget] = useState(false);
  const [showCsvImport, setShowCsvImport] = useState(false);
  const [newBudget, setNewBudget] = useState({ name: '', limit: '' });
  const [searchQuery, setSearchQuery] = useState('');
  const [visibleCount, setVisibleCount] = useState(20);
  const [viewMode, setViewMode] = useState<'table' | 'box'>('box');

  const [boxColors, setBoxColors] = useState<Record<string, string>>(() => {
    const saved = localStorage.getItem('saphyr_transactions_colors_v3');
    return saved ? JSON.parse(saved) : {};
  });

  const [layoutOrder, setLayoutOrder] = useState<string[]>(() => {
    const saved = localStorage.getItem('saphyr_transactions_layout');
    return saved ? JSON.parse(saved) : ['power', 'forge', 'budgets'];
  });

  const handleColorChange = (id: string, color: string) => {
    const newColors = { ...boxColors, [id]: color };
    setBoxColors(newColors);
    localStorage.setItem('saphyr_transactions_colors_v3', JSON.stringify(newColors));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setLayoutOrder((items) => {
        const oldIndex = items.indexOf(active.id as string);
        const newIndex = items.indexOf(over.id as string);
        const newOrder = arrayMove(items, oldIndex, newIndex);
        localStorage.setItem('saphyr_transactions_layout', JSON.stringify(newOrder));
        return newOrder;
      });
    }
  };

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));

  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();

  const safeFormat = (val: any) => {
    if (isPrivacyMode) return '••••';
    const num = parseFloat(val || '0');
    return isNaN(num) ? '0.00' : num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const metrics = useMemo(() => {
    const monthlyBills = (accounts || []).filter(acc => acc && acc.is_bill).reduce((sum, acc) => sum + Math.abs(parseFloat(acc.balance || '0')), 0);
    const totalOtherIncome = (incomeSources || []).reduce((sum, src) => {
      const amt = parseFloat(src.amount);
      const mult = src.frequency === 'weekly' ? (52/12) : (src.frequency === 'bi-weekly' ? (26/12) : 1);
      return sum + (amt * mult);
    }, 0);
    const monthlyNetPay = parseFloat(taxEstimate?.monthly_net || '0');
    const startingBudget = monthlyNetPay + totalOtherIncome - monthlyBills;

    const spentThisMonth = (transactions || [])
      .filter(tx => {
        const d = new Date(tx.date);
        const now = new Date();
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear() && tx.type === 'expense';
      })
      .reduce((sum, tx) => sum + parseFloat(tx.amount || '0'), 0);

    const remainingAvailable = startingBudget - spentThisMonth;
    return { remainingAvailable };
  }, [accounts, taxEstimate, incomeSources, transactions]);

  const filteredTransactions = (transactions || []).filter(tx => { const query = searchQuery.toLowerCase(); return ( (tx.category?.toLowerCase().includes(query)) || (tx.description?.toLowerCase().includes(query)) || (tx.amount?.toString().includes(query)) ); });
  const displayTransactions = filteredTransactions.slice(0, visibleCount);

  const handleCreateBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createBudget({ user_id: userId, name: newBudget.name, monthly_limit: parseFloat(newBudget.limit) });
      setNewBudget({ name: '', limit: '' });
      setShowAddBudget(false);
      loadData();
    } catch (err) { console.error(err); }
  };

  const handleDeleteBudget = async (id: string, name: string) => {
    const isConfirmed = await confirm({ title: 'Delete Budget Box', message: `Are you sure you want to delete the "${name}" budget box?`, confirmLabel: 'DELETE BOX', isDanger: true });
    if (isConfirmed) { try { await deleteBudget(id); loadData(); } catch (err) { console.error(err); } }
  };

  const handleDeleteTx = async (id: string, category: string, amount: number) => {
    const isConfirmed = await confirm({ title: 'Remove Log', message: `Delete transaction: ${category} ($${amount})?`, confirmLabel: 'DELETE LOG', isDanger: true });
    if (isConfirmed) { try { await deleteTransaction(id); loadData(); } catch (err) { console.error(err); } }
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

  const sections = {
    power: (
      <SortableItem key="power" id="power" isEditMode={isEditMode}>
        <div className="card" style={{ display: 'flex', flexWrap: 'wrap', gap: '40px', marginBottom: '40px', background: 'rgba(59, 130, 246, 0.04)', border: `1px solid ${boxColors['power'] || '#3b82f6'}`, borderRadius: '24px', padding: '30px 40px', width: '100%', boxSizing: 'border-box', justifyContent: 'center', alignItems: 'center', '--local-accent': boxColors['power'] || '#3b82f6' } as any}>
          {renderColorPicker('power', '#3b82f6')}
          <div className="spec-gauge" style={{ textAlign: 'center' }}>
            <label style={{ fontSize: '0.6rem', color: 'var(--text-muted)', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: '8px', display: 'block' }}>MONTHLY AVAILABLE</label>
            <div className="gauge-val" style={{ color: metrics.remainingAvailable >= 0 ? 'var(--text)' : 'var(--danger)', fontFamily: "'JetBrains Mono', monospace", fontSize: '2.2rem', fontWeight: 900 }}>${safeFormat(metrics.remainingAvailable)}</div>
          </div>
        </div>
      </SortableItem>
    ),
    forge: (
      <SortableItem key="forge" id="forge" isEditMode={isEditMode}>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '15px' }}>
          <button onClick={() => setShowCsvImport(!showCsvImport)} style={{ fontSize: '0.65rem', fontWeight: 900, background: showCsvImport ? 'var(--primary-gradient)' : 'var(--subtle-overlay)', color: showCsvImport ? 'white' : 'var(--text)', border: '1px solid var(--border)', borderRadius: '8px', padding: '6px 12px', cursor: 'pointer' }}>
            {showCsvImport ? 'MANUAL LOG' : 'BULK IMPORT (CSV)'}
          </button>
        </div>
        {showCsvImport ? (
          <CsvImport userId={userId} accounts={accounts} onImportComplete={() => { setShowCsvImport(false); loadData(); }} onCancel={() => setShowCsvImport(false)} />
        ) : (
          <section className="card" style={{ borderTop: `4px solid ${boxColors['log'] || 'var(--primary)'}`, borderLeft: `4px solid ${boxColors['log'] || 'var(--primary)'}`, padding: '45px', position: 'relative', marginBottom: '40px', '--local-accent': boxColors['log'] || '#3b82f6' } as any}>
            {renderColorPicker('log', 'var(--primary)')}
            <div style={{ fontSize: '1rem', fontWeight: 900, color: boxColors['log'] || 'var(--primary)', textAlign: 'center', marginBottom: '40px', letterSpacing: '0.2em', textTransform: 'uppercase' }}>
              Transaction Submission
            </div>
            <TransactionForm accounts={accounts} budgets={budgets} userId={userId} onTransactionAdded={loadData} customColor={boxColors['log'] || 'var(--primary)'} />
          </section>
        )}
      </SortableItem>
    ),
    budgets: (
      <SortableItem key="budgets" id="budgets" isEditMode={isEditMode}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3 style={{ margin: 0, fontWeight: 900, fontSize: '1.1rem', color: 'var(--text)' }}>BUDGET BOXES</h3>
          <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
            <div style={{ display: 'flex', background: 'var(--subtle-overlay)', padding: '3px', borderRadius: '8px', border: '1px solid var(--border)' }}>
              <button onClick={() => setViewMode('table')} style={{ padding: '4px 10px', fontSize: '0.6rem', background: viewMode === 'table' ? 'var(--primary-gradient)' : 'transparent', border: 'none', borderRadius: '6px', color: viewMode === 'table' ? 'white' : 'var(--text)', cursor: 'pointer', boxShadow: 'none', width: 'auto', marginTop: 0 }}>TABLE</button>
              <button onClick={() => setViewMode('box')} style={{ padding: '4px 10px', fontSize: '0.6rem', background: viewMode === 'box' ? 'var(--primary-gradient)' : 'transparent', border: 'none', borderRadius: '6px', color: viewMode === 'box' ? 'white' : 'var(--text)', cursor: 'pointer', boxShadow: 'none', width: 'auto', marginTop: 0 }}>BOX</button>
            </div>
            <button onClick={() => setShowAddBudget(!showAddBudget)} className="add-goal-btn" style={{ fontSize: '0.65rem' }}>{showAddBudget ? 'CANCEL' : '+ NEW BOX'}</button>
          </div>
        </div>
        {showAddBudget && (
          <form onSubmit={handleCreateBudget} className="add-goal-form card" style={{ marginBottom: '30px', padding: '45px', borderTop: '4px solid var(--primary)', borderLeft: '4px solid var(--primary)', '--local-accent': '#3b82f6' } as any}>
            <div style={{ fontSize: '1rem', fontWeight: 900, color: 'var(--primary)', textAlign: 'center', marginBottom: '40px', letterSpacing: '0.2em', textTransform: 'uppercase' }}>Create Budget Box</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}><label style={{ fontWeight: 900, fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.12em' }}>Box Name</label><input required placeholder="e.g. Groceries" value={newBudget.name} onChange={e => setNewBudget({...newBudget, name: e.target.value})} style={{ padding: '18px 20px' }} /></div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <label style={{ fontWeight: 900, fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.12em' }}>Monthly Limit</label>
                <div className="currency-input-wrapper">
                  <span className="currency-prefix" style={{ paddingLeft: '20px' }}>$</span>
                  <input required type="number" placeholder="0.00" value={newBudget.limit} onChange={e => setNewBudget({...newBudget, limit: e.target.value})} style={{ padding: '18px 20px', paddingLeft: '10px' }} />
                </div>
              </div>
              <button type="submit" className="primary-btn" style={{ height: '60px', marginTop: '10px' }}>CREATE BOX</button>
            </div>
          </form>
        )}
        <div className="grid" style={{ gridTemplateColumns: viewMode === 'box' ? 'repeat(auto-fill, minmax(240px, 1fr))' : '1fr', gap: '20px' }}>
          {viewMode === 'table' && ( <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr 1fr 40px', padding: '0 25px 10px 25px', fontSize: '0.65rem', fontWeight: 900, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}><span>Category</span><span style={{ textAlign: 'right' }}>Spent</span><span style={{ textAlign: 'right' }}>Limit</span><span style={{ textAlign: 'right' }}>Remaining</span><span></span></div> )}
          {(budgets || []).map(budget => {
            const spent = (transactions || []).filter(tx => { const d = new Date(tx.date); return tx.budget_category_id === budget.id && d.getMonth() === currentMonth && d.getFullYear() === currentYear && tx.type === 'expense'; }).reduce((sum, tx) => sum + parseFloat(tx.amount || '0'), 0);
            const limit = parseFloat(budget.monthly_limit || '0');
            const remaining = limit - spent;
            const progress = Math.min(100, (spent / limit) * 100);
            const bColor = boxColors[budget.id] || '#3b82f6';
            if (viewMode === 'table') { return ( <div key={budget.id} className="card card-condensed" style={{ borderLeft: `4px solid ${bColor}`, display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr 1fr 40px', alignItems: 'center', '--local-accent': bColor } as any}><div style={{ fontWeight: 900, fontSize: '0.9rem' }}>{budget.name.toUpperCase()}</div><div style={{ textAlign: 'right', fontFamily: "'JetBrains Mono', monospace", fontWeight: 800 }}>${safeFormat(spent)}</div><div style={{ textAlign: 'right', fontFamily: "'JetBrains Mono', monospace", fontWeight: 800 }}>${safeFormat(limit)}</div><div style={{ textAlign: 'right', fontFamily: "'JetBrains Mono', monospace", fontWeight: 900, color: remaining >= 0 ? 'var(--success)' : 'var(--danger)' }}>${safeFormat(remaining)}</div><div style={{ textAlign: 'right' }}><button onClick={() => handleDeleteBudget(budget.id, budget.name)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.2rem', padding: 0 }}>&times;</button></div></div> ); }
            return ( <div key={budget.id} className="card card-condensed" style={{ borderTop: `4px solid ${bColor}`, borderLeft: `4px solid ${bColor}`, position: 'relative', '--local-accent': bColor } as any}>{renderColorPicker(budget.id, '#3b82f6')}<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}><h4 style={{ margin: 0, fontSize: '0.85rem', fontWeight: 900, color: 'var(--text-muted)' }}>{budget.name.toUpperCase()}</h4><button onClick={() => handleDeleteBudget(budget.id, budget.name)} className="remove-btn-minimal" style={{ fontSize: '1.1rem' }}>&times;</button></div><div style={{ fontSize: '1.6rem', fontWeight: 900, margin: '10px 0', color: remaining >= 0 ? 'var(--text)' : 'var(--danger)' }}>${safeFormat(remaining)}</div><div className="progress-container" style={{ background: 'var(--subtle-overlay)' }}><div className="progress-bar" style={{ width: `${progress}%`, background: progress > 90 ? 'var(--danger-gradient)' : (progress > 50 ? 'var(--warning-gradient)' : 'var(--success-gradient)') }}></div></div><div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px', fontSize: '0.6rem', fontWeight: 800, color: 'var(--text-muted)' }}><span>SPENT: ${safeFormat(spent)}</span><span>LIMIT: ${safeFormat(limit)}</span></div></div> );
          })}
        </div>
      </SortableItem>
    )
  };

  return (
    <div className="transactions-page">
      <UserGuide guideKey="transactions_v2" title="Live Spending Compass">
        <p>Your "Daily Power" is your most critical metric. Customize your view and track spending with "Architect Mode."</p>
      </UserGuide>

      <div className="accounts-grid-layout">
        <div className="workflow-column">
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={layoutOrder} strategy={verticalListSortingStrategy}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {layoutOrder.map(id => (sections as any)[id])}
              </div>
            </SortableContext>
          </DndContext>
        </div>

        <div className="summary-column">
          <div className="sticky-ticker-column">
            <h3 style={{ fontSize: '0.9rem', fontWeight: 900, color: 'var(--text)', marginBottom: '20px', textAlign: 'center', letterSpacing: '0.1em' }}>RECENT LOGS</h3>
            <div className="form-group" style={{ marginBottom: '15px' }}>
              <input type="text" placeholder="SEARCH LOGS..." value={searchQuery} onChange={e => {setSearchQuery(e.target.value); setVisibleCount(20);}} style={{ background: 'var(--input-bg)', fontSize: '0.75rem', border: '2px solid var(--border)' }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {displayTransactions.map(tx => {
                const acc = accounts.find(a => a.id === tx.account_id);
                const budget = budgets.find(b => b.id === tx.budget_category_id);
                return (
                  <div key={tx.id} className="ticker-item card glow-primary" style={{ padding: '15px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div><div style={{ fontWeight: 800, fontSize: '0.9rem' }}>{tx.category}</div><div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{tx.date?.split('T')[0]} • {acc?.name || 'CASH'}</div>{budget && <div style={{ fontSize: '0.6rem', color: 'var(--primary)', fontWeight: 900, marginTop: '2px' }}>[{budget.name.toUpperCase()}]</div>}</div>
                      <div style={{ textAlign: 'right' }}><div style={{ fontWeight: 900, fontSize: '1rem' }} className={`currency ${tx.type === 'income' ? 'positive' : 'negative'}`}>{tx.type === 'income' ? '+' : '-'}${safeFormat(tx.amount)}</div><button onClick={() => handleDeleteTx(tx.id, tx.category, tx.amount)} className="remove-mini-btn" style={{ fontSize: '0.6rem', fontWeight: 800, marginTop: '5px' }}>REMOVE</button></div>
                    </div>
                  </div>
                );
              })}
              {filteredTransactions.length > visibleCount && <button onClick={() => setVisibleCount(prev => prev + 20)} className="primary-btn" style={{ fontSize: '0.7rem' }}>LOAD MORE</button>}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .transactions-page { max-width: 1200px; margin: 0 auto; padding: 0 20px; box-sizing: border-box; }
        .accounts-grid-layout { display: grid; grid-template-columns: 1fr; gap: 40px; width: 100%; box-sizing: border-box; padding-bottom: 100px; }
        @media (min-width: 1024px) { .accounts-grid-layout { grid-template-columns: minmax(0, 1.8fr) minmax(380px, 1.2fr); align-items: start; } }
        .workflow-column { display: flex; flex-direction: column; width: 100%; box-sizing: border-box; }
        .sticky-ticker-column { position: sticky; top: 100px; max-height: calc(100vh - 150px); overflow-y: auto; scrollbar-width: none; }
        .ticker-item { border: 2px solid var(--border) !important; background: var(--bg); transition: all 0.2s ease; }
        .ticker-item:hover { transform: translateX(-4px); border-color: var(--primary) !important; }
        .progress-container { width: 100%; height: 8px; border-radius: 4px; overflow: hidden; margin-top: 10px; border: 1px solid var(--border); }
        .progress-bar { height: 100%; transition: width 0.8s cubic-bezier(0.4, 0, 0.2, 1); }
        .remove-btn-minimal { background: none; border: none; color: var(--text-muted); cursor: pointer; padding: 0; width: auto; box-shadow: none; }
        .add-goal-btn { background: var(--subtle-overlay); border: 1px solid var(--border); color: var(--text); padding: 8px 15px; border-radius: 8px; cursor: pointer; width: auto; font-weight: 900; }
        .add-goal-form { border-radius: 16px; border: 2px solid var(--border); }
        .primary-btn { background: var(--primary-gradient); width: 100%; fontWeight: 900; margin-top: 10px; }
      `}</style>
    </div>
  );
};

export default TransactionsPage;
