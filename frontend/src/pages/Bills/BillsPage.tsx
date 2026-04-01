import React, { useState } from 'react';
import UserGuide from '../../components/UserGuide/UserGuide';
import { deleteAccount, updateAccount } from '../../services/api';
import BillForm from '../../components/BillForm/BillForm';
import BillSimulator from '../../components/BillSimulator/BillSimulator';
import { useAuth } from '../../context/AuthContext';
import { useModal } from '../../context/ModalContext';

interface BillsPageProps {
  userId: string;
  accounts: any[];
  loadData: () => void;
}

const ACCENT_OPTIONS = ['var(--primary)', '#10b981', '#8b5cf6', '#f43f5e', '#f59e0b', '#06b6d4', '#fb7185', '#64748b'];

const BillsPage: React.FC<BillsPageProps> = ({ userId, accounts, loadData }) => {
  const { isPrivacyMode, isEditMode } = useAuth();
  const { confirm } = useModal();
  const [viewMode, setViewMode] = useState<'table' | 'box'>('box');
  const [activeTab, setActiveTab] = useState<'tracker' | 'simulator'>('tracker');

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
      <UserGuide guideKey="bills_v2" title="Obligation Command Deck">
        <p>Manage your fixed monthly costs. Mark bills as [PAID] to clear them from your current month's liquidity projection.</p>
      </UserGuide>

      <div className="tech-specs-bar" style={{ display: 'flex', gap: '20px', marginBottom: '40px', background: 'var(--card)', border: '2px solid var(--border)', borderRadius: '16px', padding: '15px 25px', width: '100%', boxSizing: 'border-box', borderTop: '4px solid var(--danger)' }}>
        <div className="spec-gauge" style={{ flex: 1, textAlign: 'center', borderRight: '1px solid var(--item-divider)' }}>
          <label style={{ fontSize: '0.6rem', color: 'var(--text-muted)', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Monthly Burn</label>
          <div className="gauge-val" style={{ color: 'var(--danger)', fontFamily: 'JetBrains Mono, monospace', fontSize: '1.4rem', fontWeight: 900, marginTop: '4px' }}>${safeFormat(totalMonthlyBills)}</div>
        </div>
        <div className="spec-gauge" style={{ flex: 1, textAlign: 'center', borderRight: '1px solid var(--item-divider)' }}>
          <label style={{ fontSize: '0.6rem', color: 'var(--text-muted)', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Total Obligations</label>
          <div className="gauge-val" style={{ color: 'var(--text)', fontFamily: 'JetBrains Mono, monospace', fontSize: '1.4rem', fontWeight: 900, marginTop: '4px' }}>{bills.length}</div>
        </div>
        <div className="spec-gauge" style={{ flex: 1, textAlign: 'center' }}>
          <label style={{ fontSize: '0.6rem', color: 'var(--text-muted)', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Next Due</label>
          <div className="gauge-val" style={{ color: 'var(--text)', fontFamily: 'JetBrains Mono, monospace', fontSize: '1.4rem', fontWeight: 900, marginTop: '4px' }}>--</div>
        </div>
      </div>

      <div className="mode-switcher-v2" style={{ display: 'flex', gap: '15px', marginBottom: '30px' }}>
        <button onClick={() => setActiveTab('tracker')} style={{ flex: 1, background: activeTab === 'tracker' ? 'var(--primary-gradient)' : 'var(--subtle-overlay)', color: activeTab === 'tracker' ? 'white' : 'var(--text-muted)' }}>OBLIGATION TRACKER</button>
        <button onClick={() => setActiveTab('simulator')} style={{ flex: 1, background: activeTab === 'simulator' ? 'var(--primary-gradient)' : 'var(--subtle-overlay)', color: activeTab === 'simulator' ? 'white' : 'var(--text-muted)' }}>LOAN SIMULATOR</button>
      </div>

      {activeTab === 'tracker' ? (
        <div className="accounts-grid-layout">
          <div className="workflow-column">
            <section className="card glow-danger" style={{ borderLeft: `5px solid ${boxColors['log'] || 'var(--danger)'}`, background: 'var(--subtle-overlay)', padding: '35px', position: 'relative', marginBottom: '30px' }}>
              {renderColorPicker('log')}
              <BillForm onBillAdded={loadData} userId={userId} groups={billGroups} customColor={boxColors['log'] || 'var(--danger)'} />
            </section>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '15px' }}>
              <h3 style={{ margin: 0, fontWeight: 900, fontSize: '1.1rem', color: 'var(--text)' }}>OBLIGATIONS</h3>
              <div style={{ display: 'flex', background: 'var(--subtle-overlay)', padding: '3px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                <button onClick={() => setViewMode('table')} style={{ padding: '4px 10px', fontSize: '0.6rem', background: viewMode === 'table' ? 'var(--primary-gradient)' : 'transparent', border: 'none', borderRadius: '6px', color: 'white', cursor: 'pointer', boxShadow: 'none', width: 'auto', marginTop: 0 }}>TABLE</button>
                <button onClick={() => setViewMode('box')} style={{ padding: '4px 10px', fontSize: '0.6rem', background: viewMode === 'box' ? 'var(--primary-gradient)' : 'transparent', border: 'none', borderRadius: '6px', color: 'white', cursor: 'pointer', boxShadow: 'none', width: 'auto', marginTop: 0 }}>BOX</button>
              </div>
            </div>

            <div className="grid" style={{ gridTemplateColumns: viewMode === 'box' ? 'repeat(auto-fill, minmax(280px, 1fr))' : '1fr', gap: '20px' }}>
              {bills.map(bill => {
                const bColor = boxColors[bill.id] || 'var(--primary)';
                return (
                  <div key={bill.id} className="card glow-primary" style={{ borderTop: `4px solid ${bColor}`, position: 'relative', padding: '25px', opacity: bill.is_paid ? 0.6 : 1 }}>
                    {renderColorPicker(bill.id)}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 900, color: 'var(--text-muted)' }}>{bill.name.toUpperCase()}</h4>
                      <button onClick={() => handleDeleteBill(bill.id, bill.name)} className="remove-btn-minimal" style={{ fontSize: '1.1rem' }}>&times;</button>
                    </div>
                    <div style={{ fontSize: '1.8rem', fontWeight: 900, margin: '15px 0', color: 'var(--text)' }}>${safeFormat(Math.abs(bill.balance))}</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '15px' }}>
                      <span style={{ fontSize: '0.6rem', fontWeight: 800, color: 'var(--text-muted)' }}>DUE: DAY {bill.due_date || '--'}</span>
                      <button onClick={() => handleTogglePaid(bill)} style={{ width: 'auto', padding: '6px 15px', fontSize: '0.65rem', background: bill.is_paid ? 'var(--success-gradient)' : 'var(--subtle-overlay)', color: bill.is_paid ? 'white' : 'var(--text)' }}>{bill.is_paid ? 'PAID' : 'MARK PAID'}</button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="summary-column">
            <div className="sticky-ticker-column">
              <h3 style={{ fontSize: '0.9rem', fontWeight: 900, color: 'var(--text)', marginBottom: '20px', textAlign: 'center', letterSpacing: '0.1em' }}>HEALTH METRICS</h3>
              <section className="card glow-primary" style={{ padding: '30px', textAlign: 'center' }}>
                <label style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-muted)' }}>DTI RATIO (Fixed)</label>
                <div style={{ fontSize: '2.5rem', fontWeight: 900, margin: '10px 0', color: 'var(--primary)' }}>--%</div>
                <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Percentage of your gross income committed to fixed obligations.</p>
              </section>
            </div>
          </div>
        </div>
      ) : (
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <section className="card glow-primary" style={{ padding: '35px' }}>
            <BillSimulator bills={bills} />
          </section>
        </div>
      )}

      <style>{`
        .bills-page { max-width: 1200px; margin: 0 auto; padding: 0 20px; box-sizing: border-box; }
        .accounts-grid-layout { display: grid; grid-template-columns: 1fr; gap: 40px; width: 100%; box-sizing: border-box; padding-bottom: 100px; }
        @media (min-width: 1024px) { .accounts-grid-layout { grid-template-columns: minmax(0, 1.8fr) minmax(380px, 1.2fr); align-items: start; } }
        .workflow-column { display: flex; flex-direction: column; width: 100%; box-sizing: border-box; }
        .sticky-ticker-column { position: sticky; top: 100px; }
        .remove-btn-minimal { background: none; border: none; color: var(--text-muted); cursor: pointer; padding: 0; width: auto; box-shadow: none; }
        .primary-btn { background: var(--primary-gradient); width: 100%; fontWeight: 900; margin-top: 10px; }
      `}</style>
    </div>
  );
};

export default BillsPage;
