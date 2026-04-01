import React, { useState, useEffect } from 'react';
import UserGuide from '../../components/UserGuide/UserGuide';
import { useModal } from '../../context/ModalContext';
import { useAuth } from '../../context/AuthContext';
import { 
  createIncomeSource, 
  deleteIncomeSource,
  addDeduction,
  deleteDeduction,
  resetAccountApi
} from '../../services/api';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

interface IncomePageProps {
  userId: string;
  savedSalary: any; 
  taxEstimate: any;
  incomeSources: any[];
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

const ACCENT_OPTIONS = ['var(--primary)', '#10b981', '#8b5cf6', '#f43f5e', '#f59e0b', '#06b6d4', '#fb7185', '#64748b'];

const IncomePage: React.FC<IncomePageProps> = ({ 
  userId, savedSalary, taxEstimate, incomeSources, handleSalarySubmit, loadData
}) => {
  const { confirm } = useModal();
  const { isEditMode } = useAuth();
  const [activeStep, setActiveStep] = useState<number>(1);
  const [isSpecsExpanded, setIsSpecsExpanded] = useState(false);
  const [localFilingStatus, setLocalFilingStatus] = useState('');
  const [localState, setLocalState] = useState('');
  const [isHourly, setIsHourly] = useState(savedSalary?.is_hourly || false);
  const [hourlyRate, setHourlyRate] = useState(0);
  const [hoursPerWeek, setHoursPerWeek] = useState(0);
  const [annualGross, setAnnualGross] = useState(0);
  const [pct401k, setPct401k] = useState(0);
  const [useManualTax, setUseManualTax] = useState(savedSalary?.use_manual_tax || false);
  const [manualTaxAmount, setManualTaxAmount] = useState(0);
  
  const [newDeduction, setNewDeduction] = useState({ name: '', amount: '', is_pre_tax: true, frequency: 'monthly' });
  const [newSource, setNewSource] = useState({ name: '', amount: '', is_taxed: false, frequency: 'monthly' });
  
  const [syncMessage, setSyncMessage] = useState('');
  const [isPulsing, setIsPulsing] = useState(false);

  const [boxColors, setBoxColors] = useState<Record<string, string>>(() => {
    const saved = localStorage.getItem('saphyr_income_colors');
    return saved ? JSON.parse(saved) : {};
  });

  const handleColorChange = (id: string, color: string) => {
    const newColors = { ...boxColors, [id]: color };
    setBoxColors(newColors);
    localStorage.setItem('saphyr_income_colors', JSON.stringify(newColors));
  };

  useEffect(() => {
    if (savedSalary) {
      setIsHourly(savedSalary.is_hourly || false);
      setUseManualTax(savedSalary.use_manual_tax || false);
    }
  }, [savedSalary]);

  useEffect(() => {
    if (taxEstimate) {
      setIsPulsing(true);
      const timer = setTimeout(() => setIsPulsing(false), 1000);
      return () => clearTimeout(timer);
    }
  }, [taxEstimate]);

  const safeFormat = (val: any) => {
    const num = parseFloat(val || '0');
    return isNaN(num) ? '0.00' : num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const onSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!localFilingStatus || !localState) {
      await confirm({ title: 'Selection Required', message: 'Please select both a Filing Status and Residing State before syncing.', confirmLabel: 'UNDERSTOOD' });
      return;
    }
    const payload = {
      is_hourly: isHourly,
      hourly_rate: Number(hourlyRate) || savedSalary?.hourly_rate,
      hours_per_week: Number(hoursPerWeek) || savedSalary?.hours_per_week,
      annual_salary: annualGross > 0 ? Number(annualGross) : (isHourly && hourlyRate > 0 ? (Number(hourlyRate) * (Number(hoursPerWeek) || 40) * 52) : savedSalary?.annual_salary),
      contribution_401k_percent: pct401k > 0 ? (Number(pct401k) / 100) : (savedSalary?.['401k_percent'] / 100),
      use_manual_tax: useManualTax,
      manual_tax_amount: Number(manualTaxAmount) || savedSalary?.manual_tax_amount,
      state: localState
    };
    handleSalarySubmit(e, localFilingStatus, payload);
    setSyncMessage('CHANGES SYNCHRONIZED');
    setAnnualGross(0); setHourlyRate(0); setHoursPerWeek(0); setManualTaxAmount(0); setPct401k(0); setLocalFilingStatus(''); setLocalState('');
    setActiveStep(2); 
    setTimeout(() => setSyncMessage(''), 3000);
  };

  const handleResetIncomeOnly = async () => {
    const isConfirmed = await confirm({ title: 'Reset Architect', message: 'This will clear your salary, tax profile, and deductions to allow a fresh start. Proceed?', confirmLabel: 'RESET ARCHITECT', isDanger: true });
    if (isConfirmed) {
      try {
        await resetAccountApi();
        setSyncMessage('ARCHITECT RESET COMPLETE');
        loadData();
        setTimeout(() => window.location.reload(), 1500);
      } catch (err) { await confirm({ title: 'Error', message: 'Reset failed. Please try again.' }); }
    }
  };

  const onAddDeduction = async (e: React.FormEvent) => {
    e.preventDefault();
    await addDeduction(newDeduction);
    setNewDeduction({ name: '', amount: '', is_pre_tax: true, frequency: 'monthly' });
    loadData();
  };

  const onAddSource = async (e: React.FormEvent) => {
    e.preventDefault();
    await createIncomeSource({ ...newSource, user_id: userId });
    setNewSource({ name: '', amount: '', is_taxed: false, frequency: 'monthly' });
    loadData();
  };

  const handleExportBlueprint = async () => {
    const doc = new jsPDF();
    doc.setFontSize(22); doc.setTextColor(59, 130, 246);
    doc.text('SAPHYR INCOME BLUEPRINT', 105, 20, { align: 'center' });
    doc.setFontSize(10); doc.setTextColor(100, 116, 139);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 105, 30, { align: 'center' });
    doc.save(`saphyr_income_blueprint_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const totalOtherIncome = (incomeSources || []).reduce((sum, s) => {
    const amt = parseFloat(s.amount);
    const multiplier = s.frequency === 'weekly' ? (52/12) : (s.frequency === 'bi-weekly' ? (26/12) : 1);
    return sum + (amt * multiplier);
  }, 0);
  
  const totalVerifiedNetMonthly = (taxEstimate?.monthly_net || 0) + totalOtherIncome;

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
    <div className="income-page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', gap: '20px', flexWrap: 'wrap' }}>
        <UserGuide guideKey="income_v7" title="Income Architect">
          <p>Your financial command deck. Follow the steps to build your net wealth projection.</p>
        </UserGuide>
        <div style={{ display: 'flex', gap: '15px' }}>
          <button onClick={handleExportBlueprint} className="export-blueprint-btn">EXPORT BLUEPRINT</button>
          <button onClick={handleResetIncomeOnly} className="reset-architect-btn">RESET ARCHITECT</button>
        </div>
      </div>

      <div className="tech-specs-bar">
        <div className="spec-gauge">
          <label>Monthly Base</label>
          <div className="gauge-val">${safeFormat(taxEstimate?.annual_salary / 12)}</div>
        </div>
        <div className="spec-gauge">
          <label>Derived Hourly</label>
          <div className="gauge-val">${safeFormat(taxEstimate?.hourly_rate)}</div>
        </div>
        <div className="spec-gauge">
          <label>Tax Bracket</label>
          <div className="gauge-val">{((taxEstimate?.effective_rate || 0) * 100).toFixed(1)}%</div>
        </div>
      </div>

      {syncMessage && <div className="sync-banner">{syncMessage}</div>}

      <div className="income-grid-layout">
        
        <div className="workflow-column">
          {/* STEP 1: EARNINGS */}
          <div className={`workflow-step ${activeStep === 1 ? 'focused' : 'collapsed'}`}>
            <div className="step-indicator" onClick={() => setActiveStep(1)} style={{ borderColor: boxColors['step1'] || 'var(--primary)', color: boxColors['step1'] || 'var(--text)' }}>1</div>
            <section className="card" onClick={() => activeStep !== 1 && setActiveStep(1)} style={{ borderLeft: `5px solid ${boxColors['step1'] || 'var(--primary)'}`, background: 'var(--subtle-overlay)', position: 'relative' }}>
              {renderColorPicker('step1')}
              <div className="step-header">
                <h3 className="centered-title">EARNINGS</h3>
                {activeStep !== 1 && <span className="step-summary-label" style={{ color: boxColors['step1'] || 'var(--primary)' }}>${safeFormat(taxEstimate?.annual_salary)}/yr</span>}
              </div>
              
              {activeStep === 1 && (
                <div className="step-content-expanded">
                  <div className="mode-switcher" style={{ marginBottom: '30px' }}>
                    <button type="button" onClick={() => setIsHourly(false)} className={!isHourly ? 'active' : ''} style={!isHourly ? { background: boxColors['step1'] || 'var(--primary)' } : {}}>SALARY</button>
                    <button type="button" onClick={() => setIsHourly(true)} className={isHourly ? 'active' : ''} style={isHourly ? { background: boxColors['step1'] || 'var(--primary)' } : {}}>HOURLY</button>
                  </div>

                  <form onSubmit={onSaveProfile} className="workflow-form" style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
                    {isHourly ? (
                      <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                        <div className="form-group"><label>Hourly Rate ($)</label><input type="number" step="0.01" value={hourlyRate || ''} placeholder="0.00" onChange={e => setHourlyRate(parseFloat(e.target.value) || 0)} style={{ borderColor: boxColors['step1'] || 'var(--border)' }} /></div>
                        <div className="form-group"><label>Hours / Week</label><input type="number" value={hoursPerWeek || ''} placeholder="40" onChange={e => setHoursPerWeek(parseInt(e.target.value) || 0)} style={{ borderColor: boxColors['step1'] || 'var(--border)' }} /></div>
                      </div>
                    ) : (
                      <div className="form-group"><label>Annual Gross Salary ($)</label><input type="number" value={annualGross || ''} placeholder="0.00" onChange={e => setAnnualGross(parseFloat(e.target.value) || 0)} style={{ borderColor: boxColors['step1'] || 'var(--border)' }} /></div>
                    )}

                    <div className="grid" style={{ gridTemplateColumns: '1.5fr 1fr', gap: '20px' }}>
                      <div className="form-group"><label>Filing Status</label><select value={localFilingStatus} onChange={e => setLocalFilingStatus(e.target.value)}><option value="">-- Select --</option><option value="single">Single</option><option value="married_joint">Married Filing Jointly</option><option value="married_separate">Married Filing Separately</option><option value="head_household">Head of Household</option><option value="widow">Qualifying Surviving Spouse</option></select></div>
                      <div className="form-group"><label>Residing State</label><select value={localState} onChange={e => setLocalState(e.target.value)}><option value="">-- Select --</option>{US_STATES.map(s => <option key={s.code} value={s.code}>{s.code}</option>)}</select></div>
                    </div>
                    <button type="submit" className="primary-btn" style={{ background: boxColors['step1'] || 'var(--primary)' }}>SYNC EARNINGS</button>
                  </form>
                </div>
              )}
            </section>
          </div>

          {/* STEP 2: DEDUCTIONS */}
          <div className={`workflow-step ${activeStep === 2 ? 'focused' : 'collapsed'}`}>
            <div className="step-indicator" onClick={() => setActiveStep(2)} style={{ borderColor: boxColors['step2'] || 'var(--warning)', color: boxColors['step2'] || 'var(--text)' }}>2</div>
            <section className="card" onClick={() => activeStep !== 2 && setActiveStep(2)} style={{ borderLeft: `5px solid ${boxColors['step2'] || 'var(--primary)'}`, background: 'var(--subtle-overlay)', position: 'relative' }}>
              {renderColorPicker('step2')}
              <div className="step-header">
                <h3 className="centered-title">DEDUCTIONS</h3>
                {activeStep !== 2 && <span className="step-summary-label" style={{ color: boxColors['step2'] || 'var(--primary)' }}>-{safeFormat((taxEstimate?.deduction_401k + taxEstimate?.total_pre_tax_deductions) / 12)}/mo</span>}
              </div>
              
              {activeStep === 2 && (
                <div className="step-content-expanded">
                  <div className="form-group" style={{ marginBottom: '30px' }}>
                    <label>401k Contribution (%)</label>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <input type="number" value={pct401k || ''} placeholder="0%" onChange={e => setPct401k(parseFloat(e.target.value) || 0)} style={{ borderColor: boxColors['step2'] || 'var(--border)' }} />
                      <button type="button" onClick={onSaveProfile} className="warning-btn" style={{ background: boxColors['step2'] || 'var(--warning)' }}>SET</button>
                    </div>
                  </div>
                  
                  <div className="item-list">
                    {(savedSalary?.custom_deductions || []).length === 0 && <div className="empty-state">No Pre-Tax Obligations Logged</div>}
                    {(savedSalary?.custom_deductions || []).map((d: any) => (
                      <div key={d.id} className="workflow-item">
                        <div><span>{d.name}</span><div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>{d.frequency}</div></div>
                        <div className="item-right"><span className="negative">-${safeFormat(d.amount)}</span><button type="button" onClick={async () => { await deleteDeduction(d.id); loadData(); }} className="remove-btn">&times;</button></div>
                      </div>
                    ))}
                  </div>

                  <form onSubmit={onAddDeduction} className="add-item-form">
                    <div className="form-group"><label style={{ fontSize: '0.65rem' }}>New Pre-Tax (Health, HSA)</label><input placeholder="Obligation Name" value={newDeduction.name} onChange={e => setNewDeduction({...newDeduction, name: e.target.value})} style={{ borderColor: boxColors['step2'] || 'var(--border)' }} /></div>
                    <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '15px', marginTop: '15px' }}>
                      <input type="number" placeholder="Amount $" value={newDeduction.amount} onChange={e => setNewDeduction({...newDeduction, amount: e.target.value})} style={{ borderColor: boxColors['step2'] || 'var(--border)' }} />
                      <select value={newDeduction.frequency} onChange={e => setNewDeduction({...newDeduction, frequency: e.target.value})} style={{ fontSize: '0.75rem' }}><option value="monthly">Monthly</option><option value="bi-weekly">Bi-Weekly</option><option value="weekly">Weekly</option></select>
                    </div>
                    <button type="submit" className="add-btn" style={{ width: '100%', marginTop: '15px', background: boxColors['step2'] || 'var(--subtle-overlay)' }}>ADD DEDUCTION</button>
                  </form>
                </div>
              )}
            </section>
          </div>

          {/* STEP 3: OTHER INCOME */}
          <div className={`workflow-step ${activeStep === 3 ? 'focused' : 'collapsed'}`}>
            <div className="step-indicator" onClick={() => setActiveStep(3)} style={{ borderColor: boxColors['step3'] || 'var(--success)', color: boxColors['step3'] || 'var(--text)' }}>3</div>
            <section className="card" onClick={() => activeStep !== 3 && setActiveStep(3)} style={{ borderLeft: `5px solid ${boxColors['step3'] || 'var(--primary)'}`, background: 'var(--subtle-overlay)', position: 'relative' }}>
              {renderColorPicker('step3')}
              <div className="step-header">
                <h3 className="centered-title">OTHER INCOME</h3>
                {activeStep !== 3 && <span className="step-summary-label" style={{ color: boxColors['step3'] || 'var(--primary)' }}>+${safeFormat(totalOtherIncome)}/mo</span>}
              </div>
              
              {activeStep === 3 && (
                <div className="step-content-expanded">
                  <div className="item-list">
                    {(incomeSources || []).length === 0 && <div className="empty-state">No Additional Sources Logged</div>}
                    {(incomeSources || []).map(src => (
                      <div key={src.id} className="workflow-item">
                        <div><span>{src.name} {src.is_taxed && <small className="taxed-label">(Taxed)</small>}</span><div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>{src.frequency}</div></div>
                        <div className="item-right"><span className="positive">+${safeFormat(src.amount)}</span><button type="button" onClick={async () => { await deleteIncomeSource(src.id); loadData(); }} className="remove-btn">&times;</button></div>
                      </div>
                    ))}
                  </div>
                  <form onSubmit={onAddSource} className="add-item-form success">
                    <input placeholder="Source Name" value={newSource.name} onChange={e => setNewSource({...newSource, name: e.target.value})} style={{ marginBottom: '15px', borderColor: boxColors['step3'] || 'var(--border)' }} />
                    <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                      <input type="number" placeholder="Amount $" value={newSource.amount} onChange={e => setNewSource({...newSource, amount: e.target.value})} style={{ borderColor: boxColors['step3'] || 'var(--border)' }} />
                      <select value={newSource.frequency} onChange={e => setNewSource({...newSource, frequency: e.target.value})} style={{ fontSize: '0.75rem' }}><option value="monthly">Monthly</option><option value="bi-weekly">Bi-Weekly</option><option value="weekly">Weekly</option></select>
                    </div>
                    <button type="submit" className="add-btn-success" style={{ width: '100%', marginTop: '15px', background: boxColors['step3'] || 'var(--success)' }}>ADD SOURCE</button>
                  </form>
                </div>
              )}
            </section>
          </div>
        </div>

        {/* SUMMARY */}
        <div className="summary-column">
          <section className={`card sticky-summary-v2 ${isPulsing ? 'pulse-glow' : ''}`}>
            <div className="summary-header-v2"><label>FINAL ASSESSMENT</label><h3>NET TAKE-HOME</h3></div>
            <div className="summary-details-v2">
              <div className="summary-row-v2"><span className="label">Monthly Gross</span><span className="value currency">${safeFormat(taxEstimate?.annual_salary / 12)}</span></div>
              <div className="summary-row-v2"><span className="label negative">401k + Deductions</span><span className="value negative currency">-${safeFormat((taxEstimate?.deduction_401k + taxEstimate?.total_pre_tax_deductions) / 12)}</span></div>
              <div className="summary-row-v2"><span className="label negative">FICA (SS + Medicare)</span><span className="value negative currency">-${safeFormat(taxEstimate?.fica_tax / 12)}</span></div>
              <div className="tax-module-v2">
                <div className="tax-header-v2"><span className="label negative">COMBINED TAXES</span><button type="button" onClick={() => { setUseManualTax(!useManualTax); onSaveProfile(new Event('submit') as any); }} className="override-btn-v2">{useManualTax ? 'MANUAL' : 'AUTO'}</button></div>
                {useManualTax ? (
                  <div className="manual-tax-input-v2"><input type="number" value={manualTaxAmount || ''} placeholder="0.00" onChange={e => setManualTaxAmount(parseFloat(e.target.value) || 0)} /><button type="button" onClick={onSaveProfile}>OK</button></div>
                ) : (
                  <div className="tax-breakdown-v2"><div className="tax-main-v2 negative">-${safeFormat((taxEstimate?.estimated_tax + taxEstimate?.state_tax) / 12)}</div><div className="tax-sub-v2">Fed: -${safeFormat(taxEstimate?.estimated_tax / 12)} • State ({taxEstimate?.state}): -${safeFormat(taxEstimate?.state_tax / 12)}</div></div>
                )}
              </div>
              <div className="summary-row-v2" style={{ marginTop: '10px' }}><span className="label positive">Other Income</span><span className="value positive currency">+${safeFormat(totalOtherIncome)}</span></div>
              <div className="final-result-box-v2"><div className="result-label-v2">VERIFIED MONTHLY NET</div><div className="result-value-v2 currency positive">${safeFormat(totalVerifiedNetMonthly)}</div><div className="annual-projection-v2">≈ ${safeFormat(totalVerifiedNetMonthly * 12)} ANNUALLY</div></div>
              <div className="specs-toggle-container-v2"><button onClick={() => setIsSpecsExpanded(!isSpecsExpanded)} className="specs-toggle-btn-v2">{isSpecsExpanded ? 'HIDE TECH SPECS' : 'SHOW TECH SPECS'}</button>
                {isSpecsExpanded && (
                  <div className="specs-expanded-content-v2">
                    <div className="spec-line-v2"><span>2025 Standard Deduction</span><strong>${(taxEstimate?.filing_status === 'married_joint' || taxEstimate?.filing_status === 'widow') ? '30,000' : '15,000'}</strong></div>
                    <div className="spec-line-v2"><span>Social Security (OASDI)</span><strong>6.2%</strong></div>
                    <div className="spec-line-v2"><span>Medicare (HI)</span><strong>1.45%</strong></div>
                    {taxEstimate?.annual_salary > 200000 && <div className="spec-line-v2"><span>Addl. Medicare Surcharge</span><strong>0.9%</strong></div>}
                    <div className="spec-line-v2"><span>State Income Tax ({taxEstimate?.state})</span><strong>{['TX','FL','WA','NV','AK','SD','TN','WY'].includes(taxEstimate?.state) ? '0%' : '≈ 5%'}</strong></div>
                  </div>
                )}
              </div>
              <div className="tax-disclaimer-v2">*Estimates based on 2025 brackets.</div>
            </div>
          </section>
        </div>
      </div>

      <div className="mobile-summary-footer">
        <div className="footer-label">NET TAKE-HOME</div>
        <div className="footer-value currency positive">${safeFormat(totalVerifiedNetMonthly)}</div>
      </div>

      <style>{`
        .income-page { max-width: 1200px; margin: 0 auto; padding: 0 20px; box-sizing: border-box; }
        .export-blueprint-btn { width: auto; background: var(--primary); color: white; font-size: 0.65rem; font-weight: 800; padding: 8px 15px; borderRadius: 8px; cursor: pointer; boxShadow: none; marginTop: 0; }
        .reset-architect-btn { width: auto; background: none; border: 1px solid var(--danger); color: var(--danger); font-size: 0.65rem; font-weight: 800; padding: 8px 15px; borderRadius: 8px; cursor: pointer; boxShadow: none; marginTop: 0; }
        
        .tech-specs-bar { display: flex; gap: 20px; margin-bottom: 30px; background: var(--card); border: 2px solid var(--border); border-radius: 16px; padding: 15px 25px; overflow-x: auto; scrollbar-width: none; }
        .spec-gauge { flex: 1; min-width: 120px; display: flex; flex-direction: column; gap: 4px; border-right: 1px solid var(--item-divider); text-align: center; }
        .spec-gauge:last-child { border-right: none; }
        .spec-gauge label { font-size: 0.6rem; color: var(--text-muted); font-weight: 900; text-transform: uppercase; letter-spacing: 0.1em; }
        .gauge-val { font-family: 'JetBrains Mono', monospace; font-size: 1.1rem; font-weight: 900; color: var(--text); }

        .sync-banner { background: var(--success); color: white; padding: 15px; borderRadius: 12px; textAlign: center; fontWeight: 900; fontSize: 0.8rem; letterSpacing: 0.1em; marginBottom: 25px; animation: pageEnter 0.3s ease; }
        .income-grid-layout { display: grid; grid-template-columns: 1fr; gap: 40px; width: 100%; box-sizing: border-box; padding-bottom: 100px; }
        @media (min-width: 1024px) { .income-grid-layout { grid-template-columns: minmax(0, 1.8fr) minmax(380px, 1.2fr); align-items: start; } }

        .workflow-column { display: flex; flex-direction: column; gap: 25px; position: relative; width: 100%; box-sizing: border-box; }
        .workflow-column::before { content: ''; position: absolute; left: 20px; top: 0; bottom: 0; width: 2px; background: var(--border); z-index: 0; opacity: 0.3; }
        
        .workflow-step { position: relative; padding-left: 60px; z-index: 1; width: 100%; box-sizing: border-box; transition: all 0.4s ease; }
        .workflow-step.collapsed { opacity: 0.7; }
        .workflow-step.collapsed section { cursor: pointer; padding: 15px 25px; }
        .step-indicator { position: absolute; left: 0; top: 15px; width: 40px; height: 40px; border-radius: 50%; background: var(--bg); border: 2px solid var(--primary); color: var(--text); display: flex; align-items: center; justify-content: center; fontWeight: 900; font-size: 1.1rem; box-shadow: 0 0 15px var(--accent-glow); flex-shrink: 0; cursor: pointer; transition: all 0.3s ease; }
        
        .centered-title { text-align: center; margin: 0 0 25px 0; font-size: 1.1rem; font-weight: 900; letter-spacing: 0.05em; color: var(--text); }
        .mode-switcher { display: flex; gap: 15px; }
        .mode-switcher button { flex: 1; font-size: 0.75rem; background: rgba(255,255,255,0.05); color: var(--text-muted); border: 1px solid var(--border); padding: 12px; borderRadius: 10px; }
        .mode-switcher button.active { color: white; border-color: transparent; font-weight: 900; }

        /* RESTORED FINAL ASSESSMENT */
        .sticky-summary-v2 { position: sticky; top: 100px; background: var(--card); border: 2px solid var(--border); padding: 35px; box-shadow: 0 20px 50px -12px rgba(0,0,0,0.5); width: 100%; box-sizing: border-box; text-align: center; }
        .summary-header-v2 { margin-bottom: 30px; }
        .summary-header-v2 label { font-size: 0.7rem; font-weight: 800; color: var(--text-muted); letter-spacing: 0.15em; }
        .summary-header-v2 h3 { font-size: 1.3rem; font-weight: 900; margin-top: 8px; color: var(--text); }
        .summary-row-v2 { display: flex; justify-content: space-between; font-size: 0.95rem; font-weight: 700; margin-bottom: 12px; }
        .summary-row-v2 .label { color: var(--text-muted); }
        .tax-module-v2 { background: rgba(244, 63, 94, 0.03); padding: 20px; border-radius: 16px; border: 1px solid rgba(244, 63, 94, 0.15); text-align: center; margin: 15px 0; }
        .tax-header-v2 { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; }
        .tax-header-v2 .label { font-size: 0.75rem; font-weight: 900; }
        .override-btn-v2 { width: auto; padding: 4px 10px; font-size: 0.6rem; background: rgba(255,255,255,0.05); }
        .tax-main-v2 { font-size: 1.6rem; font-weight: 900; font-family: 'JetBrains Mono', monospace; }
        .tax-sub-v2 { font-size: 0.65rem; color: var(--text-muted); margin-top: 8px; }
        .final-result-box-v2 { margin-top: 25px; padding: 35px 20px; background: var(--bg); border-radius: 20px; border: 3px solid var(--primary); display: flex; flex-direction: column; align-items: center; gap: 10px; box-shadow: 0 0 30px var(--accent-glow); }
        .result-label-v2 { font-size: 0.75rem; font-weight: 900; color: var(--primary); letter-spacing: 0.2em; }
        .result-value-v2 { font-size: 3rem; font-weight: 900; line-height: 1; }
        .annual-projection-v2 { font-size: 0.85rem; font-weight: 800; color: var(--text-muted); opacity: 0.8; }
        .tax-disclaimer-v2 { font-size: 0.65rem; color: var(--text-muted); text-align: center; margin-top: 25px; font-style: italic; }
        .specs-toggle-container-v2 { margin-top: 20px; border-top: 1px solid var(--border); padding-top: 20px; }
        .specs-toggle-btn-v2 { background: none; border: none; color: var(--primary); font-size: 0.7rem; font-weight: 900; cursor: pointer; padding: 0; box-shadow: none; width: auto; letter-spacing: 0.1em; }
        .specs-expanded-content-v2 { margin-top: 15px; display: flex; flex-direction: column; gap: 10px; text-align: left; }
        .spec-line-v2 { display: flex; justify-content: space-between; font-size: 0.75rem; border-bottom: 1px solid var(--border); padding-bottom: 6px; }

        .sticky-summary-v2.pulse-glow { animation: sapphirePulse 1s ease; }
        @keyframes sapphirePulse {
          0% { box-shadow: 0 20px 50px -12px rgba(0,0,0,0.5); border-color: var(--border); }
          50% { box-shadow: 0 0 30px var(--primary); border-color: var(--primary); }
          100% { box-shadow: 0 20px 50px -12px rgba(0,0,0,0.5); border-color: var(--border); }
        }

        .mobile-summary-footer { display: none; position: fixed; bottom: 0; left: 0; right: 0; background: var(--card); border-top: 3px solid var(--primary); padding: 15px 25px; z-index: 1000; justify-content: space-between; align-items: center; box-shadow: 0 -10px 30px rgba(0,0,0,0.5); }
        @media (max-width: 1023px) { .summary-column { display: none; } .mobile-summary-footer { display: flex; } .income-page { padding-bottom: 100px; } }

        .primary-btn { width: 100%; fontWeight: 900; margin-top: 10px; }
        .warning-btn { width: auto; background: var(--warning); color: black; font-weight: 900; margin-top: 0; }
        .add-btn { width: auto; background: var(--subtle-overlay); }
        .add-btn-success { width: auto; background: var(--success); color: black; font-weight: 900; }
        .remove-btn { background: none; border: none; color: var(--text-muted); font-size: 1.5rem; cursor: pointer; padding: 0; width: auto; margin-top: 0; box-shadow: none; }
      `}</style>
    </div>
  );
};

export default IncomePage;
