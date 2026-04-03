import React, { useState, useEffect, useMemo } from 'react';
import UserGuide from '../../components/UserGuide/UserGuide';
import { useModal } from '../../context/ModalContext';
import { useAuth } from '../../context/AuthContext';
import { 
  createIncomeSource, 
  deleteIncomeSource,
  updateIncomeSource,
  addDeduction,
  deleteDeduction,
  updateDeduction,
} from '../../services/api';
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

interface IncomePageProps {
  userId: string;
  savedSalary: any; 
  taxEstimate: any;
  incomeSources: any[];
  accounts: any[];
  handleSalarySubmit: (e: any, status: string, extraData?: any) => void;
  loadData: () => void;
}

const US_STATES = [
  { code: 'AK', name: 'Alaska' }, { code: 'AL', name: 'Alabama' }, { code: 'AR', name: 'Arkansas' }, { code: 'AZ', name: 'Arizona' },
  { code: 'CA', name: 'California' }, { code: 'CO', name: 'Colorado' }, { code: 'CT', name: 'Connecticut' }, { code: 'DE', name: 'Delaware' },
  { code: 'FL', name: 'Florida' }, { code: 'GA', name: 'Georgia' }, { code: 'HI', name: 'Hawaii' }, { code: 'IA', name: 'Iowa' },
  { code: 'ID', name: 'Idaho' }, { code: 'IL', name: 'Illinois' }, { code: 'IN', name: 'Indiana' }, { code: 'KS', name: 'Kansas' },
  { code: 'KY', name: 'Kentucky' }, { code: 'LA', name: 'Louisiana' }, { code: 'MA', name: 'Massachusetts' }, { code: 'MD', name: 'Maryland' },
  { code: 'ME', name: 'Maine' }, { code: 'MI', name: 'Michigan' }, { code: 'MN', name: 'Minnesota' }, { code: 'MO', name: 'Missouri' },
  { code: 'MS', name: 'Mississippi' }, { code: 'MT', name: 'Montana' }, { code: 'NC', name: 'North Carolina' }, { code: 'ND', name: 'North Dakota' },
  { code: 'NE', name: 'Nebraska' }, { code: 'NH', name: 'New Hampshire' }, { code: 'NJ', name: 'New Jersey' }, { code: 'NM', name: 'New Mexico' },
  { code: 'NV', name: 'Nevada' }, { code: 'NY', name: 'New York' }, { code: 'OH', name: 'Ohio' }, { code: 'OK', name: 'Oklahoma' },
  { code: 'OR', name: 'Oregon' }, { code: 'PA', name: 'Pennsylvania' }, { code: 'RI', name: 'Rhode Island' }, { code: 'SC', name: 'South Carolina' },
  { code: 'SD', name: 'South Dakota' }, { code: 'TN', name: 'Tennessee' }, { code: 'TX', name: 'Texas' }, { code: 'UT', name: 'Utah' },
  { code: 'VA', name: 'Virginia' }, { code: 'VT', name: 'Vermont' }, { code: 'WA', name: 'Washington' }, { code: 'WI', name: 'Wisconsin' },
  { code: 'WV', name: 'West Virginia' }, { code: 'WY', name: 'Wyoming' }
];

const ACCENT_OPTIONS = ['#3b82f6', '#10b981', '#8b5cf6', '#f43f5e', '#f59e0b', '#06b6d4', '#fb7185', '#64748b'];

const IncomePage: React.FC<IncomePageProps> = ({ 
  userId, savedSalary, taxEstimate, incomeSources, accounts, handleSalarySubmit, loadData
}) => {
  const { confirm } = useModal();
  const { isEditMode } = useAuth();

  const [localFilingStatus, setLocalFilingStatus] = useState('');
  const [localState, setLocalState] = useState('');
  const [isHourly, setIsHourly] = useState(false);
  const [hourlyRate, setHourlyRate] = useState(0);
  const [hoursPerWeek, setHoursPerWeek] = useState(40);
  const [annualGross, setAnnualGross] = useState(0);
  const [salaryAccountId, setSalaryAccountId] = useState('');
  const [pct401k, setPct401k] = useState(0);
  
  const [newDeduction, setNewDeduction] = useState({ id: null, name: '', amount: '', is_pre_tax: true, frequency: 'monthly', account_id: '' });
  const [newSource, setNewSource] = useState({ id: null, name: '', amount: '', is_taxed: false, frequency: 'monthly', account_id: '' });
  
  const [isDeductionFormOpen, setIsDeductionFormOpen] = useState(false);
  const [isSourceFormOpen, setIsSourceFormOpen] = useState(false);

  const [syncMessage, setSyncMessage] = useState('');
  const [hasInitialPopulated, setHasInitialPopulated] = useState(false);

  const [boxColors, setBoxColors] = useState<Record<string, string>>(() => {
    const saved = localStorage.getItem('saphyr_income_colors_v2');
    return saved ? JSON.parse(saved) : {};
  });

  const [layoutOrder, setLayoutOrder] = useState<string[]>(() => {
    const saved = localStorage.getItem('saphyr_income_layout');
    return saved ? JSON.parse(saved) : ['assessment', 'forge', 'ribbon', 'modules', 'log'];
  });

  const handleColorChange = (id: string, color: string) => {
    const newColors = { ...boxColors, [id]: color };
    setBoxColors(newColors);
    localStorage.setItem('saphyr_income_colors_v2', JSON.stringify(newColors));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setLayoutOrder((items) => {
        const oldIndex = items.indexOf(active.id as string);
        const newIndex = items.indexOf(over.id as string);
        const newOrder = arrayMove(items, oldIndex, newIndex);
        localStorage.setItem('saphyr_income_layout', JSON.stringify(newOrder));
        return newOrder;
      });
    }
  };

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));

  useEffect(() => {
    if (savedSalary && !hasInitialPopulated) {
      setIsHourly(!!savedSalary.is_hourly);
      if (savedSalary.is_hourly) { setHourlyRate(savedSalary.hourly_rate || 0); setHoursPerWeek(savedSalary.hours_per_week || 40); } 
      else { setAnnualGross(savedSalary.annual_salary || 0); }
      setPct401k((savedSalary.contribution_401k_percent || 0) * 100);
      setLocalFilingStatus(savedSalary.filing_status || '');
      setLocalState(savedSalary.state || '');
      setSalaryAccountId(savedSalary.account_id || '');
      setHasInitialPopulated(true);
    }
  }, [savedSalary, hasInitialPopulated]);

  const safeFormat = (val: any) => {
    const num = parseFloat(val || '0');
    return isNaN(num) ? '0.00' : num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const onSaveProfile = async (e: React.FormEvent) => {
    if (e && e.preventDefault) e.preventDefault();
    const calculatedAnnual = isHourly ? (Number(hourlyRate) * Number(hoursPerWeek) * 52) : Number(annualGross);
    const payload = { is_hourly: isHourly, hourly_rate: isHourly ? Number(hourlyRate) : 0, hours_per_week: isHourly ? Number(hoursPerWeek) : 40, annual_salary: calculatedAnnual, contribution_401k_percent: Number(pct401k) / 100, state: localState, filing_status: localFilingStatus, account_id: salaryAccountId || null };
    setSyncMessage('SYNCING...');
    await handleSalarySubmit(e, localFilingStatus, payload);
    setSyncMessage('PROFILE UPDATED');
    setTimeout(() => setSyncMessage(''), 3000);
  };

  const handleEditDeduction = (d: any) => { setNewDeduction({ id: d.id, name: d.name, amount: d.amount.toString(), is_pre_tax: !!d.is_pre_tax, frequency: d.frequency, account_id: d.account_id || '' }); setIsDeductionFormOpen(true); setTimeout(() => { document.getElementById('deduction-form')?.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 100); };
  const handleEditSource = (s: any) => { setNewSource({ id: s.id, name: s.name, amount: s.amount.toString(), is_taxed: !!s.is_taxed, frequency: s.frequency, account_id: s.account_id || '' }); setIsSourceFormOpen(true); setTimeout(() => { document.getElementById('source-form')?.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 100); };

  const onDeductionSubmit = async (e: React.FormEvent) => { e.preventDefault(); try { if (newDeduction.id) { await updateDeduction(newDeduction.id, newDeduction); } else { await addDeduction(newDeduction); } setNewDeduction({ id: null, name: '', amount: '', is_pre_tax: true, frequency: 'monthly', account_id: '' }); setIsDeductionFormOpen(false); loadData(); } catch (err) { console.error(err); } };
  const onSourceSubmit = async (e: React.FormEvent) => { e.preventDefault(); try { if (newSource.id) { await updateIncomeSource(newSource.id, newSource); } else { await createIncomeSource({ ...newSource, user_id: userId }); } setNewSource({ id: null, name: '', amount: '', is_taxed: false, frequency: 'monthly', account_id: '' }); setIsSourceFormOpen(false); loadData(); } catch (err) { console.error(err); } };

  const rawGross = Number(savedSalary?.annual_salary) || 0;
  const monthlyGross = rawGross / 12;
  const raw401kPct = (Number(savedSalary?.contribution_401k_percent) || 0);
  const rawState = savedSalary?.state || 'WA';
  const rawFiling = savedSalary?.filing_status || 'single';

  const monthly401k = (rawGross * raw401kPct) / 12;
  const preTaxDeductionsMonthly = (savedSalary?.custom_deductions || []).filter((d: any) => d.is_pre_tax).reduce((sum: number, d: any) => sum + (Number(d.amount) * (d.frequency === 'weekly' ? 52/12 : d.frequency === 'bi-weekly' ? 26/12 : 1)), 0);
  const totalMonthlyPreTax = monthly401k + preTaxDeductionsMonthly;

  const taxedOtherIncomeAnnual = (incomeSources || []).filter(s => s.is_taxed === true).reduce((sum, s) => sum + (parseFloat(s.amount) * (s.frequency === 'weekly' ? 52 : s.frequency === 'bi-weekly' ? 26 : 12)), 0);
  const standardDeduction = (rawFiling === 'married_joint' || rawFiling === 'widow') ? 30000 : 15000;
  const taxableIncome = Math.max(0, rawGross + taxedOtherIncomeAnnual - (totalMonthlyPreTax * 12) - standardDeduction);
  const monthlyFica = (Math.min(rawGross + taxedOtherIncomeAnnual, 176100) * 0.0765) / 12;

  let annualFedTax = 0;
  if (taxableIncome > 0) {
    if (rawFiling === 'single') {
      if (taxableIncome <= 11925) annualFedTax = taxableIncome * 0.10;
      else if (taxableIncome <= 48475) annualFedTax = 1192.50 + (taxableIncome - 11925) * 0.12;
      else if (taxableIncome <= 103350) annualFedTax = 5578.50 + (taxableIncome - 48475) * 0.22;
      else annualFedTax = 17651 + (taxableIncome - 103350) * 0.24;
    } else {
      if (taxableIncome <= 23850) annualFedTax = taxableIncome * 0.10;
      else if (taxableIncome <= 96950) annualFedTax = 2385 + (taxableIncome - 23850) * 0.12;
      else annualFedTax = 11157 + (taxableIncome - 96950) * 0.22;
    }
  }
  const monthlyFedTax = annualFedTax / 12;
  const noTaxStates = ['AK','FL','NV','SD','TN','TX','WA','WY'];
  const monthlyStateTax = noTaxStates.includes(rawState) ? 0 : (taxableIncome * 0.05) / 12;
  const totalMonthlyTaxes = monthlyFedTax + monthlyFica + monthlyStateTax;

  const postTaxDeductionsMonthly = (savedSalary?.custom_deductions || []).filter((d: any) => !d.is_pre_tax).reduce((sum: number, d: any) => sum + (Number(d.amount) * (d.frequency === 'weekly' ? 52/12 : d.frequency === 'bi-weekly' ? 26/12 : 1)), 0);
  const totalOtherIncomeMonthly = (incomeSources || []).reduce((sum, s) => {
    const amt = parseFloat(s.amount);
    const mult = s.frequency === 'weekly' ? (52/12) : (s.frequency === 'bi-weekly' ? (26/12) : 1);
    return sum + (amt * mult);
  }, 0);

  const monthlyNetTakeHome = monthlyGross + totalOtherIncomeMonthly - totalMonthlyTaxes - totalMonthlyPreTax - postTaxDeductionsMonthly;

  const renderColorPicker = (id: string) => (
    isEditMode && (
      <div style={{ position: 'absolute', top: '10px', right: '10px', zIndex: 10, display: 'flex', gap: '4px', background: 'rgba(0,0,0,0.5)', padding: '4px', borderRadius: '20px', border: '1px solid var(--border)' }}>
        {ACCENT_OPTIONS.map(c => (
          <button key={c} type="button" onClick={() => handleColorChange(id, c)} style={{ width: '12px', height: '12px', borderRadius: '50%', background: c, border: (boxColors[id] || '#3b82f6') === c ? '1.5px solid white' : 'none', cursor: 'pointer', padding: 0 }} />
        ))}
      </div>
    )
  );

  const labelStyle = { fontWeight: 900, fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' as const, letterSpacing: '0.12em', marginBottom: '10px', display: 'block' };
  const groupStyle = { display: 'flex', flexDirection: 'column' as const, marginBottom: '30px' };

  const sections = {
    assessment: (
      <SortableItem key="assessment" id="assessment" isEditMode={isEditMode}>
        <section className="card" style={{ background: 'var(--primary-gradient)', textAlign: 'center', padding: '15px 20px', borderRadius: '20px', border: 'none', maxWidth: '500px', margin: '0 auto', '--local-accent': '#3b82f6' } as any}>
          <h3 style={{ fontSize: '1rem', fontWeight: 900, color: 'rgba(255,255,255,0.9)', letterSpacing: '0.3em', marginBottom: '5px', textTransform: 'uppercase' }}>Verified Monthly Net</h3>
          <div className="currency" style={{ fontSize: '2.4rem', fontWeight: 900, color: 'white', lineHeight: 1 }}>${safeFormat(monthlyNetTakeHome)}</div>
          <div className="currency" style={{ fontSize: '0.85rem', fontWeight: 800, color: 'rgba(255,255,255,0.6)', marginTop: '4px' }}>≈ ${safeFormat(monthlyNetTakeHome * 12)} ANNUALLY</div>
        </section>
      </SortableItem>
    ),
    forge: (
      <SortableItem key="forge" id="forge" isEditMode={isEditMode}>
        <section className="card" style={{ borderTop: `5px solid ${boxColors['income'] || '#3b82f6'}`, borderLeft: `5px solid ${boxColors['income'] || '#3b82f6'}`, '--local-accent': boxColors['income'] || '#3b82f6', padding: '45px' } as any}>
          {renderColorPicker('income')}
          <div style={{ fontSize: '1rem', fontWeight: 900, color: boxColors['income'] || 'var(--primary)', textAlign: 'center', marginBottom: '40px', letterSpacing: '0.2em', textTransform: 'uppercase' }}>Income Architect</div>
          <div className="mode-switcher" style={{ marginBottom: '30px' }}>
            <button type="button" onClick={() => setIsHourly(false)} className={!isHourly ? 'active' : ''}>SALARY</button>
            <button type="button" onClick={() => setIsHourly(true)} className={isHourly ? 'active' : ''}>HOURLY</button>
          </div>
          <form onSubmit={onSaveProfile}>
            {isHourly ? (
              <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '30px' }}>
                <div style={groupStyle}><label style={labelStyle}>Hourly Rate</label><div className="currency-input-wrapper"><span className="currency-prefix currency" style={{ color: boxColors['income'] || 'var(--primary)', paddingLeft: '20px' }}>$</span><input className="currency" style={{ padding: '18px 20px', paddingLeft: '10px' }} type="number" step="0.01" value={hourlyRate || ''} onChange={e => setHourlyRate(parseFloat(e.target.value) || 0)} /></div></div>
                <div style={groupStyle}><label style={labelStyle}>Hours/Week</label><input style={{ padding: '18px 20px' }} type="number" value={hoursPerWeek || ''} onChange={e => setHoursPerWeek(parseInt(e.target.value) || 0)} /></div>
              </div>
            ) : (
              <div style={groupStyle}><label style={labelStyle}>Annual Gross Salary</label><div className="currency-input-wrapper"><span className="currency-prefix currency" style={{ color: boxColors['income'] || 'var(--primary)', paddingLeft: '20px' }}>$</span><input className="currency" style={{ padding: '18px 20px', paddingLeft: '10px' }} type="number" value={annualGross || ''} onChange={e => setAnnualGross(parseFloat(e.target.value) || 0)} /></div></div>
            )}
            <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '30px' }}>
              <div style={groupStyle}><label style={labelStyle}>Filing Status</label><select style={{ padding: '18px 20px' }} value={localFilingStatus} onChange={e => setLocalFilingStatus(e.target.value)}><option value="">-- Select --</option><option value="single">Single</option><option value="married_joint">Married Filing Jointly</option><option value="married_separate">Married Separate</option><option value="head_household">Head Household</option><option value="widow">Widow(er)</option></select></div>
              <div style={groupStyle}><label style={labelStyle}>Residing State</label><select style={{ padding: '18px 20px' }} value={localState} onChange={e => setLocalState(e.target.value)}><option value="">-- Select --</option>{US_STATES.map(s => <option key={s.code} value={s.code}>{s.code}</option>)}</select></div>
            </div>
            <div style={groupStyle}><label style={labelStyle}>401k Contribution (%)</label><input style={{ padding: '18px 20px' }} type="number" value={pct401k || ''} onChange={e => setPct401k(parseFloat(e.target.value) || 0)} placeholder="e.g. 6" /></div>
            <button type="submit" className="primary-btn" style={{ height: '60px', fontSize: '1.1rem', background: boxColors['income'] || 'var(--primary-gradient)', marginTop: '10px' }}>{syncMessage || 'SYNC CURRENT PROFILE'}</button>
          </form>
        </section>
      </SortableItem>
    ),
    ribbon: (
      <SortableItem key="ribbon" id="ribbon" isEditMode={isEditMode}>
        <section className="card highlight" style={{ background: 'rgba(59, 130, 246, 0.05)', border: `1px solid ${boxColors['income'] || '#3b82f6'}`, borderRadius: '20px', textAlign: 'center', padding: '12px 25px', '--local-accent': boxColors['income'] || '#3b82f6', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: '20px' } as any}>
          <h2 style={{ fontSize: '0.9rem', fontWeight: 900, color: boxColors['income'] || 'var(--primary)', letterSpacing: '0.15em', textTransform: 'uppercase', margin: 0, borderRight: `1px solid ${boxColors['income'] || 'rgba(59, 130, 246, 0.2)'}`, paddingRight: '20px' }}>Profile</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '25px', flexWrap: 'wrap', justifyContent: 'center' }}>
            <div style={{ textAlign: 'left' }}><label style={{ fontSize: '0.6rem', color: 'var(--text-muted)', display: 'block', fontWeight: 900 }}>SALARY</label><div className="currency" style={{ fontSize: '1.2rem', fontWeight: 900, color: boxColors['income'] || 'var(--primary)' }}>${safeFormat(rawGross)}</div></div>
            <div style={{ textAlign: 'left' }}><label style={{ fontSize: '0.6rem', color: 'var(--text-muted)', display: 'block', fontWeight: 900 }}>STATUS</label><div style={{ fontSize: '1.2rem', fontWeight: 900 }}>{rawFiling.replace('_', ' ').toUpperCase() || 'NOT SET'}</div></div>
            <div style={{ textAlign: 'left' }}><label style={{ fontSize: '0.6rem', color: 'var(--text-muted)', display: 'block', fontWeight: 900 }}>STATE</label><div style={{ fontSize: '1.2rem', fontWeight: 900 }}>{rawState}</div></div>
          </div>
        </section>
      </SortableItem>
    ),
    modules: (
      <SortableItem key="modules" id="modules" isEditMode={isEditMode}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
          <div className="card card-condensed" style={{ borderTop: `4px solid ${boxColors['tax'] || '#f43f5e'}`, borderLeft: `4px solid ${boxColors['tax'] || '#f43f5e'}`, '--local-accent': boxColors['tax'] || '#f43f5e' } as any}>{renderColorPicker('tax')}<h3 style={{ textAlign: 'center', fontSize: '1.1rem', fontWeight: 900, marginBottom: '20px', color: boxColors['tax'] || 'var(--danger)', textTransform: 'uppercase' }}>Tax Liability</h3><div className="dissemination-list"><div className="ledger-row"><span>Federal Income Tax</span><strong className="currency">-${safeFormat(monthlyFedTax)}</strong></div><div className="ledger-row"><span>FICA (SS/Med)</span><strong className="currency">-${safeFormat(monthlyFica)}</strong></div><div className="ledger-row"><span>State Tax ({rawState})</span><strong className="currency">-${safeFormat(monthlyStateTax)}</strong></div><div className="ledger-total" style={{ color: boxColors['tax'] || 'var(--danger)', borderTopColor: boxColors['tax'] || 'var(--danger)' }}><span>Total Tax</span><strong className="currency">-${safeFormat(totalMonthlyTaxes)}</strong></div></div></div>
          <div className="card card-condensed" style={{ borderTop: `4px solid ${boxColors['pre'] || '#f59e0b'}`, borderLeft: `4px solid ${boxColors['pre'] || '#f59e0b'}`, '--local-accent': boxColors['pre'] || '#f59e0b' } as any}>{renderColorPicker('pre')}<h3 style={{ textAlign: 'center', fontSize: '1.1rem', fontWeight: 900, marginBottom: '20px', color: boxColors['pre'] || 'var(--warning)', textTransform: 'uppercase' }}>Pre-Tax Deductions</h3><div className="dissemination-list"><div className="ledger-row"><span>401k</span><strong className="currency">-${safeFormat(monthly401k)}</strong></div><div className="ledger-row"><span>Other Pre-Tax</span><strong className="currency">-${safeFormat(preTaxDeductionsMonthly)}</strong></div><div className="ledger-total" style={{ color: boxColors['pre'] || 'var(--warning)', borderTopColor: boxColors['pre'] || 'var(--warning)' }}><span>Total Pre Tax</span><strong className="currency">-${safeFormat(totalMonthlyPreTax)}</strong></div></div></div>
          <div className="card card-condensed" style={{ borderTop: `4px solid ${boxColors['post'] || '#8b5cf6'}`, borderLeft: `4px solid ${boxColors['post'] || '#8b5cf6'}`, '--local-accent': boxColors['post'] || '#8b5cf6' } as any}>{renderColorPicker('post')}<h3 style={{ textAlign: 'center', fontSize: '1.1rem', fontWeight: 900, marginBottom: '20px', color: boxColors['post'] || '#a78bfa', textTransform: 'uppercase' }}>Post-Tax</h3><div className="dissemination-list"><div className="ledger-row"><span>Net Pay Deducts</span><strong className="currency">-${safeFormat(postTaxDeductionsMonthly)}</strong></div><div className="ledger-total" style={{ color: '#a78bfa', borderTopColor: '#a78bfa' }}><span>Total Post-Tax</span><strong className="currency">-${safeFormat(postTaxDeductionsMonthly)}</strong></div></div></div>
          <div className="card card-condensed" style={{ borderTop: `4px solid ${boxColors['other'] || '#10b981'}`, borderLeft: `4px solid ${boxColors['other'] || '#10b981'}`, '--local-accent': boxColors['other'] || '#10b981' } as any}>{renderColorPicker('other')}<h3 style={{ textAlign: 'center', fontSize: '1.1rem', fontWeight: 900, marginBottom: '20px', color: boxColors['other'] || 'var(--success)', textTransform: 'uppercase' }}>Other Revenue</h3><div className="dissemination-list"><div className="ledger-row"><span>Additional</span><strong className="currency">+${safeFormat(totalOtherIncomeMonthly)}</strong></div><div className="ledger-total" style={{ color: 'var(--success)', borderTopColor: 'var(--success)' }}><span>Total Added</span><strong className="currency">+${safeFormat(totalOtherIncomeMonthly)}</strong></div></div></div>
        </div>
      </SortableItem>
    ),
    log: (
      <SortableItem key="log" id="log" isEditMode={isEditMode}>
        <div style={{ marginTop: '20px' }}>
          <h2 style={{ textAlign: 'center', fontSize: '1.8rem', fontWeight: 900, marginBottom: '30px', textTransform: 'uppercase' }}>Revenue & Obligation Log</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
            <section className="card" style={{ display: 'flex', flexDirection: 'column', gap: '20px', '--local-accent': '#f59e0b', padding: '45px' } as any}>
              <div style={{ fontSize: '1rem', fontWeight: 900, color: 'var(--warning)', textAlign: 'center', marginBottom: '40px', letterSpacing: '0.2em', textTransform: 'uppercase' }}>Manage Deductions</div>
              <div className="item-list">
                {(savedSalary?.custom_deductions || []).map((d: any) => (
                  <div key={d.id} className="workflow-item" onClick={() => handleEditDeduction(d)} style={{ cursor: 'pointer', padding: '15px' }}>
                    <div style={{ flex: 1 }}><div style={{ fontWeight: 900, fontSize: '1rem' }}>{d.name.toUpperCase()}</div><div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{d.frequency.toUpperCase()} • {d.is_pre_tax ? 'PRE-TAX' : 'POST-TAX'}</div></div>
                    <div style={{ textAlign: 'right', display: 'flex', alignItems: 'center', gap: '12px' }}><div className="currency" style={{ fontWeight: 900, color: 'var(--danger)', fontSize: '1.1rem' }}>-${safeFormat(d.amount)}</div><div style={{ display: 'flex', gap: '8px' }}><button onClick={() => handleEditDeduction(d)} className="edit-mini-btn" style={{ fontSize: '1.2rem' }}>✎</button><button onClick={async (e) => { e.stopPropagation(); await deleteDeduction(d.id); loadData(); }} className="remove-mini-btn" style={{ fontSize: '1.6rem' }}>&times;</button></div></div>
                  </div>
                ))}
              </div>
              {!isDeductionFormOpen ? (
                <button className="primary-btn" onClick={() => setIsDeductionFormOpen(true)} style={{ background: 'var(--warning-gradient)', height: '60px', marginTop: '10px' }}>LOG NEW DEDUCTION</button>
              ) : (
                <form id="deduction-form" onSubmit={onDeductionSubmit} style={{ marginTop: '20px' }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 900, color: 'var(--primary)', textAlign: 'center', marginBottom: '30px', letterSpacing: '0.1em', background: 'rgba(59, 130, 246, 0.1)', padding: '12px', borderRadius: '10px', border: '1px solid var(--primary)' }}>{newDeduction.id ? `EDITING: ${newDeduction.name.toUpperCase()}` : 'NEW DEDUCTION ENTRY'}</div>
                  <div style={groupStyle}><label style={labelStyle}>Description</label><input style={{ padding: '18px 20px' }} required placeholder="DESCRIPTION" value={newDeduction.name} onChange={e => setNewDeduction({...newDeduction, name: e.target.value})} /></div>
                  <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '30px' }}>
                    <div style={groupStyle}><label style={labelStyle}>Amount</label><div className="currency-input-wrapper"><span className="currency-prefix currency" style={{ paddingLeft: '20px' }}>$</span><input className="currency" style={{ padding: '18px 20px', paddingLeft: '10px' }} type="number" step="0.01" required value={newDeduction.amount} onChange={e => setNewDeduction({...newDeduction, amount: e.target.value})} /></div></div>
                    <div style={groupStyle}><label style={labelStyle}>Frequency</label><select style={{ padding: '18px 20px' }} value={newDeduction.frequency} onChange={e => setNewDeduction({...newDeduction, frequency: e.target.value})}><option value="monthly">Monthly</option><option value="bi-weekly">Bi-Weekly</option><option value="weekly">Weekly</option></select></div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', justifyContent: 'center', marginBottom: '30px' }}><input type="checkbox" id="preTaxCheck" checked={newDeduction.is_pre_tax} onChange={e => setNewDeduction({...newDeduction, is_pre_tax: e.target.checked})} style={{ width: '18px', height: '18px' }} /><label htmlFor="preTaxCheck" style={{ fontSize: '0.85rem', fontWeight: 800 }}>IS THIS PRE-TAX?</label></div>
                  <div style={{ display: 'flex', gap: '15px' }}><button type="submit" className="primary-btn" style={{ flex: 2, background: 'var(--warning-gradient)', height: '60px' }}>{newDeduction.id ? 'UPDATE' : 'LOG'}</button><button type="button" onClick={() => { setIsDeductionFormOpen(false); setNewDeduction({ id: null, name: '', amount: '', is_pre_tax: true, frequency: 'monthly', account_id: '' }); }} style={{ flex: 1, background: 'rgba(255,255,255,0.05)', color: 'var(--text)', border: '1px solid var(--border)', height: '60px' }}>CANCEL</button></div>
                </form>
              )}
            </section>
            <section className="card" style={{ display: 'flex', flexDirection: 'column', gap: '20px', '--local-accent': '#10b981', padding: '45px' } as any}>
              <div style={{ fontSize: '1rem', fontWeight: 900, color: 'var(--success)', textAlign: 'center', marginBottom: '40px', letterSpacing: '0.2em', textTransform: 'uppercase' }}>Manage Other Income</div>
              <div className="item-list">
                {(incomeSources || []).map(source => (
                  <div key={source.id} className="workflow-item" onClick={() => handleEditSource(source)} style={{ cursor: 'pointer', padding: '15px' }}>
                    <div style={{ flex: 1 }}><div style={{ fontWeight: 900, fontSize: '1rem' }}>{source.name.toUpperCase()}</div><div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{source.frequency.toUpperCase()} {source.is_taxed && '• TAXED'}</div></div>
                    <div style={{ textAlign: 'right', display: 'flex', alignItems: 'center', gap: '12px' }}><div className="currency" style={{ fontWeight: 900, color: 'var(--success)', fontSize: '1.1rem' }}>+${safeFormat(source.amount)}</div><div style={{ display: 'flex', gap: '8px' }}><button onClick={() => handleEditSource(source)} className="edit-mini-btn" style={{ fontSize: '1.2rem' }}>✎</button><button onClick={async (e) => { e.stopPropagation(); await deleteIncomeSource(source.id); loadData(); }} className="remove-mini-btn" style={{ fontSize: '1.6rem' }}>&times;</button></div></div>
                  </div>
                ))}
              </div>
              {!isSourceFormOpen ? (
                <button className="primary-btn" onClick={() => setIsSourceFormOpen(true)} style={{ background: 'var(--success-gradient)', height: '60px', marginTop: '10px' }}>LOG NEW INCOME</button>
              ) : (
                <form id="source-form" onSubmit={onSourceSubmit} style={{ marginTop: '20px' }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 900, color: 'var(--primary)', textAlign: 'center', marginBottom: '30px', letterSpacing: '0.1em', background: 'rgba(59, 130, 246, 0.1)', padding: '12px', borderRadius: '10px', border: '1px solid var(--primary)' }}>{newSource.id ? `EDITING: ${newSource.name.toUpperCase()}` : 'NEW REVENUE ENTRY'}</div>
                  <div style={groupStyle}><label style={labelStyle}>Description</label><input style={{ padding: '18px 20px' }} required placeholder="DESCRIPTION" value={newSource.name} onChange={e => setNewSource({...newSource, name: e.target.value})} /></div>
                  <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '30px' }}>
                    <div style={groupStyle}><label style={labelStyle}>Amount</label><div className="currency-input-wrapper"><span className="currency-prefix currency" style={{ paddingLeft: '20px' }}>$</span><input className="currency" style={{ padding: '18px 20px', paddingLeft: '10px' }} type="number" step="0.01" required value={newSource.amount} onChange={e => setNewSource({...newSource, amount: e.target.value})} /></div></div>
                    <div style={groupStyle}><label style={labelStyle}>Frequency</label><select style={{ padding: '18px 20px' }} value={newSource.frequency} onChange={e => setNewSource({...newSource, frequency: e.target.value})}><option value="monthly">Monthly</option><option value="bi-weekly">Bi-Weekly</option><option value="weekly">Weekly</option></select></div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', justifyContent: 'center', marginBottom: '30px' }}><input type="checkbox" id="taxedCheck" checked={newSource.is_taxed} onChange={e => setNewSource({...newSource, is_taxed: e.target.checked})} style={{ width: '18px', height: '18px' }} /><label htmlFor="taxedCheck" style={{ fontSize: '0.85rem', fontWeight: 800 }}>IS THIS TAXED?</label></div>
                  <div style={{ display: 'flex', gap: '15px' }}><button type="submit" className="primary-btn" style={{ flex: 2, background: 'var(--success-gradient)', height: '60px' }}>{newSource.id ? 'UPDATE' : 'LOG'}</button><button type="button" onClick={() => { setIsSourceFormOpen(false); setNewSource({ id: null, name: '', amount: '', is_taxed: false, frequency: 'monthly', account_id: '' }); }} style={{ flex: 1, background: 'rgba(255,255,255,0.05)', color: 'var(--text)', border: '1px solid var(--border)', height: '60px' }}>CANCEL</button></div>
                </form>
              )}
            </section>
          </div>
        </div>
      </SortableItem>
    )
  };

  return (
    <div className="income-page" style={{ paddingBottom: '60px' }}>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={layoutOrder} strategy={verticalListSortingStrategy}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {layoutOrder.map(id => (sections as any)[id])}
          </div>
        </SortableContext>
      </DndContext>

      <style>{`
        .income-page { max-width: 1200px; margin: 0 auto; padding: 0 20px; }
        .mode-switcher { display: flex; gap: 10px; background: rgba(255,255,255,0.02); padding: 6px; border-radius: 12px; border: 1px solid var(--border); }
        .mode-switcher button { flex: 1; padding: 12px; border-radius: 10px; background: none; color: var(--text-muted); border: none; font-weight: 800; font-size: 0.85rem; transition: all 0.3s ease; cursor: pointer; }
        .mode-switcher button.active { background: var(--primary-gradient); color: white; box-shadow: 0 4px 15px rgba(59, 130, 246, 0.3); }
        .ledger-row { display: flex; justify-content: space-between; align-items: center; color: var(--text-muted); padding: 8px 0; font-size: 0.95rem; }
        .ledger-row strong { color: var(--text); font-weight: 900; }
        .ledger-total { display: flex; justify-content: space-between; align-items: center; font-weight: 900; border-top: 2px solid var(--border); margin-top: 12px; paddingTop: 12px; font-size: 1.05rem; }
        .item-list { display: flex; flex-direction: column; gap: 12px; max-height: 500px; overflow-y: auto; padding-right: 5px; }
        .workflow-item { display: flex; justify-content: space-between; align-items: center; background: rgba(255,255,255,0.02); border: 1px solid var(--border); border-radius: 14px; transition: all 0.2s ease; }
        .workflow-item:hover { border-color: var(--primary); background: rgba(59, 130, 246, 0.05); }
        .remove-mini-btn { background: none; border: none; color: var(--text-muted); cursor: pointer; opacity: 0.6; transition: 0.2s; padding: 5px; margin-top: 0; display: flex; align-items: center; justify-content: center; }
        .remove-mini-btn:hover { color: var(--danger); opacity: 1; transform: scale(1.1); }
        .edit-mini-btn { background: none; border: none; color: var(--text-muted); cursor: pointer; opacity: 0.6; transition: 0.2s; padding: 5px; margin-top: 0; display: flex; align-items: center; justify-content: center; }
        .edit-mini-btn:hover { color: var(--primary); opacity: 1; transform: scale(1.1); }
      `}</style>
    </div>
  );
};

export default IncomePage;
