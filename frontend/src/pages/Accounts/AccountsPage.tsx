import React, { useState } from 'react';
import UserGuide from '../../components/UserGuide/UserGuide';
import { useModal } from '../../context/ModalContext';
import { useAuth } from '../../context/AuthContext';
import { deleteAccount, createGoal, deleteGoal, updateGoal } from '../../services/api';
import AccountForm from '../../components/AccountForm/AccountForm';
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
import { motion, AnimatePresence } from 'framer-motion';

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

interface AccountsPageProps {
  userId: string;
  accounts: any[];
  goals: any[];
  loadData: () => void;
}

const ACCENT_OPTIONS = ['#3b82f6', '#10b981', '#8b5cf6', '#f43f5e', '#f59e0b', '#06b6d4', '#fb7185', '#64748b'];

const AccountsPage: React.FC<AccountsPageProps> = ({ userId, accounts, goals, loadData }) => {
  const { isPrivacyMode, isEditMode } = useAuth();
  const { confirm } = useModal();
  const [activeTab, setActiveTab] = useState<'cash' | 'goals'>('cash');
  const [editingAccount, setEditingAccount] = useState<any>(null);
  const [showGoalForm, setShowGoalForm] = useState(false);
  const [editingGoal, setEditingGoal] = useState<any>(null);
  const [newGoal, setNewGoal] = useState({ name: '', target_amount: '', current_amount: '', target_date: '' });
  const [expandedAccount, setExpandedAccount] = useState<string | null>(null);

  // Sub-Vault Local State (Simulated Persistent Storage)
  const [subVaults, setSubVaults] = useState<Record<string, {name: string, amount: number}[]>>(() => {
    const saved = localStorage.getItem('saphyr_sub_vaults');
    return saved ? JSON.parse(saved) : {};
  });

  const saveSubVaults = (newVaults: any) => {
    setSubVaults(newVaults);
    localStorage.setItem('saphyr_sub_vaults', JSON.stringify(newVaults));
  };

  const [boxColors, setBoxColors] = useState<Record<string, string>>(() => {
    const saved = localStorage.getItem('saphyr_accounts_colors_v3');
    return saved ? JSON.parse(saved) : {};
  });

  const [layoutOrder, setLayoutOrder] = useState<string[]>(() => {
    const saved = localStorage.getItem('saphyr_accounts_layout');
    return saved ? JSON.parse(saved) : ['banner', 'architect', 'assets'];
  });

  const handleColorChange = (id: string, color: string) => {
    const newColors = { ...boxColors, [id]: color };
    setBoxColors(newColors);
    localStorage.setItem('saphyr_accounts_colors_v3', JSON.stringify(newColors));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setLayoutOrder((items) => {
        const oldIndex = items.indexOf(active.id as string);
        const newIndex = items.indexOf(over.id as string);
        const newOrder = arrayMove(items, oldIndex, newIndex);
        localStorage.setItem('saphyr_accounts_layout', JSON.stringify(newOrder));
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

  const cashAccounts = (accounts || []).filter(a => !a.is_bill);
  const totalCash = cashAccounts.reduce((sum, a) => sum + parseFloat(a.balance || '0'), 0);
  const accountGroups = Array.from(new Set(accounts.map(a => a.group_name).filter(Boolean))) as string[];

  const handleDeleteAccount = async (id: string, name: string) => {
    const isConfirmed = await confirm({ title: 'Delete Asset', message: `Are you sure you want to remove "${name}"?`, confirmLabel: 'DELETE ASSET', isDanger: true });
    if (isConfirmed) { try { await deleteAccount(id); loadData(); } catch (err) { console.error(err); } }
  };

  const handleEditAccount = (acc: any) => { setEditingAccount(acc); window.scrollTo({ top: 0, behavior: 'smooth' }); };

  const onGoalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingGoal) { await updateGoal(editingGoal.id, newGoal); }
      else { await createGoal({ ...newGoal, user_id: userId }); }
      setNewGoal({ name: '', target_amount: '', current_amount: '', target_date: '' });
      setShowGoalForm(false);
      setEditingGoal(null);
      loadData();
    } catch (err) { console.error(err); }
  };

  const handleDeleteGoal = async (id: string, name: string) => {
    const isConfirmed = await confirm({ title: 'Delete Goal', message: `Are you sure you want to delete "${name}"?`, confirmLabel: 'DELETE GOAL', isDanger: true });
    if (isConfirmed) { try { await deleteGoal(id); loadData(); } catch (err) { console.error(err); } }
  };

  const handleAddSubVault = (accId: string) => {
    const name = prompt("Enter Sub-Vault Name (e.g. Emergency Fund)");
    const amount = prompt("Enter Allocation Amount");
    if (name && amount) {
      const newVaults = { ...subVaults };
      if (!newVaults[accId]) newVaults[accId] = [];
      newVaults[accId].push({ name, amount: parseFloat(amount) });
      saveSubVaults(newVaults);
    }
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
    banner: (
      <SortableItem key="banner" id="banner" isEditMode={isEditMode}>
        <div className="card" style={{ textAlign: 'center', padding: '40px', background: 'rgba(59, 130, 246, 0.04)', border: `1px solid ${boxColors['banner'] || '#3b82f6'}`, marginBottom: '40px', '--local-accent': boxColors['banner'] || '#3b82f6' } as any}>
          {renderColorPicker('banner', '#3b82f6')}
          <label style={{ fontSize: '0.7rem', fontWeight: 900, color: 'var(--text-muted)', letterSpacing: '0.2em' }}>TOTAL LIQUID CAPITAL</label>
          <div style={{ fontSize: '3rem', fontWeight: 900, color: 'var(--success)', marginTop: '10px' }} className="currency">${safeFormat(totalCash)}</div>
        </div>
      </SortableItem>
    ),
    architect: (
      <SortableItem key="architect" id="architect" isEditMode={isEditMode}>
        <div className="card" style={{ position: 'relative', marginBottom: '30px', borderTop: `4px solid ${boxColors['log'] || '#3b82f6'}`, borderLeft: `4px solid ${boxColors['log'] || '#3b82f6'}`, padding: '45px', '--local-accent': boxColors['log'] || '#3b82f6' } as any}>
          {renderColorPicker('log', '#3b82f6')}
          <div style={{ fontSize: '1rem', fontWeight: 900, color: boxColors['log'] || 'var(--primary)', textAlign: 'center', marginBottom: '40px', letterSpacing: '0.2em', textTransform: 'uppercase' }}>
            {editingAccount ? `Editing: ${editingAccount.name}` : 'Add New Account'}
          </div>
          <AccountForm onAccountAdded={() => { loadData(); setEditingAccount(null); }} userId={userId} groups={accountGroups} initialData={editingAccount} onCancel={editingAccount ? () => setEditingAccount(null) : undefined} customColor={boxColors['log'] || '#3b82f6'} />
        </div>
      </SortableItem>
    ),
    assets: (
      <SortableItem key="assets" id="assets" isEditMode={isEditMode}>
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
          {cashAccounts.map(acc => {
            const aColor = boxColors[acc.id] || '#3b82f6';
            const accSubVaults = subVaults[acc.id] || [];
            const allocated = accSubVaults.reduce((s, v) => s + v.amount, 0);
            const unallocated = parseFloat(acc.balance || '0') - allocated;
            const isExpanded = expandedAccount === acc.id;

            return (
              <motion.div 
                layout
                key={acc.id} 
                className="card" 
                onClick={() => setExpandedAccount(isExpanded ? null : acc.id)}
                style={{ borderTop: `4px solid ${aColor}`, borderLeft: `4px solid ${aColor}`, position: 'relative', cursor: 'pointer', '--local-accent': aColor } as any}
              >
                {renderColorPicker(acc.id, '#3b82f6')}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <h4 style={{ margin: 0, fontSize: '0.85rem', fontWeight: 900, color: 'var(--text-muted)' }}>{acc.name.toUpperCase()}</h4>
                  <div style={{ display: 'flex', gap: '0px', alignItems: 'center' }}>
                    <button onClick={(e) => { e.stopPropagation(); handleEditAccount(acc); }} style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: '0.9rem', width: 'auto', padding: '2px' }}>✎</button>
                    <button onClick={(e) => { e.stopPropagation(); handleDeleteAccount(acc.id, acc.name); }} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.1rem', width: 'auto', padding: '2px' }}>&times;</button>
                  </div>
                </div>
                <div style={{ fontSize: '1.8rem', fontWeight: 900 }} className="currency">${safeFormat(acc.balance)}</div>
                
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }} 
                      animate={{ height: 'auto', opacity: 1 }} 
                      exit={{ height: 0, opacity: 0 }}
                      style={{ overflow: 'hidden', marginTop: '20px', paddingTop: '20px', borderTop: '1px solid var(--border)' }}
                    >
                      <div style={{ fontSize: '0.65rem', fontWeight: 900, color: 'var(--text-muted)', marginBottom: '15px', letterSpacing: '0.1em' }}>VIRTUAL MULTI-VAULT ALLOCATION</div>
                      {accSubVaults.map((v, i) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.85rem' }}>
                          <span style={{ fontWeight: 700 }}>{v.name}</span>
                          <span className="currency" style={{ fontWeight: 900 }}>${safeFormat(v.amount)}</span>
                        </div>
                      ))}
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                        <span style={{ fontWeight: 700 }}>UNALLOCATED</span>
                        <span className="currency" style={{ fontWeight: 900, color: unallocated >= 0 ? 'var(--success)' : 'var(--danger)' }}>${safeFormat(unallocated)}</span>
                      </div>
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleAddSubVault(acc.id); }}
                        style={{ marginTop: '20px', width: '100%', height: '40px', fontSize: '0.7rem', background: 'var(--subtle-overlay)', color: 'var(--text)' }}
                      >
                        + ADD SUB-VAULT ALLOCATION
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>

                {!isExpanded && (
                  <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', marginTop: '6px', fontWeight: 800 }}>+{safeFormat(acc.monthly_inflow)}/MO INFLOW • CLICK TO EXPAND VAULTS</div>
                )}
              </motion.div>
            );
          })}
        </div>
      </SortableItem>
    )
  };

  return (
    <div className="accounts-page">
      <UserGuide guideKey="accounts_v2" title="Virtual Vault">
        <p>Your Virtual Vault centralizes liquid assets and savings goals. Use "Multi-Vault" to virtually split balances without moving money.</p>
      </UserGuide>

      <div className="mode-switcher-v2" style={{ display: 'flex', gap: '15px', marginBottom: '30px' }}>
        <button onClick={() => setActiveTab('cash')} style={{ flex: 1, background: activeTab === 'cash' ? 'var(--primary-gradient)' : 'var(--subtle-overlay)', color: activeTab === 'cash' ? 'white' : 'var(--text-muted)', height: '50px' }}>CASH ASSETS</button>
        <button onClick={() => setActiveTab('goals')} style={{ flex: 1, background: activeTab === 'goals' ? 'var(--primary-gradient)' : 'var(--subtle-overlay)', color: activeTab === 'goals' ? 'white' : 'var(--text-muted)', height: '50px' }}>SAVINGS GOALS</button>
      </div>

      {activeTab === 'cash' ? (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={layoutOrder} strategy={verticalListSortingStrategy}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {layoutOrder.map(id => (sections as any)[id])}
            </div>
          </SortableContext>
        </DndContext>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button onClick={() => setShowGoalForm(!showGoalForm)} className="add-goal-btn" style={{ fontSize: '0.7rem' }}>{showGoalForm ? 'CANCEL' : '+ NEW SAVINGS GOAL'}</button>
          </div>

          {showGoalForm && (
            <div className="card" style={{ borderTop: '4px solid var(--primary)', borderLeft: '4px solid var(--primary)', padding: '45px', '--local-accent': '#3b82f6' } as any}>
              <div style={{ fontSize: '1rem', fontWeight: 900, color: 'var(--primary)', textAlign: 'center', marginBottom: '40px', letterSpacing: '0.2em', textTransform: 'uppercase' }}>{editingGoal ? `Forging: ${editingGoal.name}` : 'Goal Architect'}</div>
              <form onSubmit={onGoalSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}><label style={{ fontWeight: 900, fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Goal Name</label><input required placeholder="e.g. Down Payment" value={newGoal.name} onChange={e => setNewGoal({...newGoal, name: e.target.value})} /></div>
                <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '30px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}><label style={{ fontWeight: 900, fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Target Amount</label><input required type="number" value={newGoal.target_amount} onChange={e => setNewGoal({...newGoal, target_amount: e.target.value})} /></div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}><label style={{ fontWeight: 900, fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Current Savings</label><input required type="number" value={newGoal.current_amount} onChange={e => setNewGoal({...newGoal, current_amount: e.target.value})} /></div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}><label style={{ fontWeight: 900, fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Target Date</label><input required type="date" value={newGoal.target_date} onChange={e => setNewGoal({...newGoal, target_date: e.target.value})} /></div>
                <button type="submit" className="primary-btn" style={{ height: '60px' }}>{editingGoal ? 'UPDATE GOAL' : 'FORGE GOAL'}</button>
              </form>
            </div>
          )}

          <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '30px' }}>
            {(goals || []).map(goal => {
              const target = parseFloat(goal.target_amount || '0');
              const current = parseFloat(goal.current_amount || '0');
              const progress = Math.min(100, (current / target) * 100);
              const remaining = target - current;
              const gColor = boxColors[goal.id] || '#8b5cf6';
              
              return (
                <div key={goal.id} className="card" style={{ borderTop: `4px solid ${gColor}`, borderLeft: `4px solid ${gColor}`, padding: '35px', textAlign: 'center', '--local-accent': gColor } as any}>
                  {renderColorPicker(goal.id, '#8b5cf6')}
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                    <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 900, color: 'var(--text-muted)' }}>{goal.name.toUpperCase()}</h4>
                    <button onClick={() => handleDeleteGoal(goal.id, goal.name)} className="remove-btn-minimal" style={{ fontSize: '1.2rem' }}>&times;</button>
                  </div>
                  <div style={{ position: 'relative', width: '120px', height: '120px', margin: '0 auto 25px auto' }}>
                    <svg viewBox="0 0 36 36" style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
                      <circle cx="18" cy="18" r="16" fill="none" stroke="var(--border)" strokeWidth="3" />
                      <circle cx="18" cy="18" r="16" fill="none" stroke={gColor} strokeWidth="3" strokeDasharray={`${progress}, 100`} strokeLinecap="round" style={{ transition: 'stroke-dasharray 1s ease' }} />
                    </svg>
                    <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', fontWeight: 900, fontSize: '1.1rem' }}>{Math.round(progress)}%</div>
                  </div>
                  <div style={{ fontSize: '1.6rem', fontWeight: 900 }} className="currency">${safeFormat(current)}</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 800, marginTop: '5px' }}>TARGET: ${safeFormat(target)}</div>
                  <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', fontWeight: 800 }}>
                    <span>DISTANCE: <span style={{ color: gColor }}>${safeFormat(remaining)}</span></span>
                    <span>BY: {goal.target_date?.split('T')[0]}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <style>{`
        .accounts-page { max-width: 1200px; margin: 0 auto; padding: 0 20px; padding-bottom: 100px; }
        .add-goal-btn { background: var(--subtle-overlay); border: 1px solid var(--border); color: var(--text); padding: 8px 15px; border-radius: 8px; cursor: pointer; width: auto; font-weight: 900; }
        .remove-btn-minimal { background: none; border: none; color: var(--text-muted); cursor: pointer; padding: 0; width: auto; box-shadow: none; }
      `}</style>
    </div>
  );
};

export default AccountsPage;
