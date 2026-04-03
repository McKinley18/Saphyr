import React, { useState } from 'react';
import { createAccount } from '../../services/api';

interface BillFormProps {
  onBillAdded: () => void;
  userId: string;
  groups: string[];
  customColor?: string;
  renderColorPicker?: () => React.ReactNode;
}

const BillForm: React.FC<BillFormProps> = ({ onBillAdded, userId, groups, customColor, renderColorPicker }) => {
  const [formData, setFormData] = useState({
    name: '',
    balance: '',
    group_name: '',
    due_day: '',
    apr: '',
    loan_term: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createAccount({
        ...formData,
        user_id: userId,
        type: (formData.group_name === 'Loans' || formData.apr !== '') ? 'Loan' : 'Utility',
        is_bill: true,
        balance: parseFloat(formData.balance) || 0,
        due_day: parseInt(formData.due_day) || 1,
        apr: (parseFloat(formData.apr) || 0) / 100,
        loan_term: parseInt(formData.loan_term) || 0
      });
      setFormData({ name: '', balance: '', group_name: '', due_day: '', apr: '', loan_term: '' });
      onBillAdded();
    } catch (err) {
      console.error("Bill creation failed:", err);
    }
  };

  const accent = customColor || 'var(--primary)';

  // THE SYMMETRY CONSTANTS (Pure Content, No Card Wrapper)
  const GAP = '30px';
  const labelStyle = { 
    fontWeight: 900, 
    fontSize: '0.75rem', 
    color: 'var(--text-muted)', 
    textTransform: 'uppercase' as const, 
    letterSpacing: '0.12em',
    marginBottom: '10px',
    display: 'block'
  };

  const groupStyle = {
    display: 'flex',
    flexDirection: 'column' as const,
    marginBottom: GAP
  };

  return (
    <div className="bill-form-content">
      <form onSubmit={handleSubmit}>
        {/* ROW 1: DESCRIPTION */}
        <div style={groupStyle}>
          <label style={labelStyle}>Description*</label>
          <input 
            required 
            value={formData.name} 
            onChange={e => setFormData({...formData, name: e.target.value})} 
            placeholder="e.g. Rent, Car Loan" 
            style={{ padding: '18px 20px' }}
          />
        </div>

        {/* ROW 2: PAYMENT & DUE DATE */}
        <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '30px' }}>
          <div style={groupStyle}>
            <label style={labelStyle}>Payment*</label>
            <div className="currency-input-wrapper">
              <span className="currency-prefix" style={{ color: accent, paddingLeft: '20px' }}>$</span>
              <input 
                required 
                type="number" 
                step="0.01" 
                value={formData.balance} 
                onChange={e => setFormData({...formData, balance: e.target.value})} 
                placeholder="0.00" 
                style={{ padding: '18px 20px', paddingLeft: '10px' }}
              />
            </div>
          </div>
          <div style={groupStyle}>
            <label style={labelStyle}>Due Date*</label>
            <div className="currency-input-wrapper" style={{ position: 'relative' }}>
              <input 
                required 
                type="number" 
                min="1" 
                max="31" 
                value={formData.due_day} 
                onChange={e => setFormData({...formData, due_day: e.target.value})} 
                placeholder="1-31" 
                style={{ padding: '18px 20px', paddingRight: '45px' }}
              />
              <span 
                onClick={() => (document.getElementById('bill-date-helper') as any)?.showPicker()}
                style={{ position: 'absolute', right: '15px', cursor: 'pointer', fontSize: '1.1rem', opacity: 0.6 }}
                title="Open Calendar"
              >
                📅
              </span>
            </div>
            <input 
              id="bill-date-helper"
              type="date" 
              style={{ position: 'absolute', opacity: 0, pointerEvents: 'none', width: 0, height: 0 }}
              onChange={e => {
                if (e.target.value) {
                  const day = new Date(e.target.value + 'T12:00:00').getDate();
                  setFormData({...formData, due_day: day.toString()});
                }
              }}
            />
          </div>
        </div>

        {/* ROW 3: CATEGORY & APR */}
        <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '30px' }}>
          <div style={groupStyle}>
            <label style={labelStyle}>Category</label>
            <input 
              list="bill-groups" 
              value={formData.group_name} 
              onChange={e => setFormData({...formData, group_name: e.target.value})} 
              placeholder="e.g. Housing" 
              style={{ padding: '18px 20px' }}
            />
            <datalist id="bill-groups">
              {(groups || []).map(g => <option key={g} value={g} />)}
            </datalist>
          </div>
          <div style={groupStyle}>
            <label style={labelStyle}>APR (%)</label>
            <input 
              type="number" 
              step="0.01" 
              value={formData.apr} 
              onChange={e => setFormData({...formData, apr: e.target.value})} 
              placeholder="e.g. 5.5" 
              style={{ padding: '18px 20px' }}
            />
          </div>
        </div>

        {/* ROW 4: LOAN TERM */}
        <div style={groupStyle}>
          <label style={labelStyle}>Total Loan Term (Months)</label>
          <input 
            type="number" 
            value={formData.loan_term} 
            onChange={e => setFormData({...formData, loan_term: e.target.value})} 
            placeholder="e.g. 60" 
            style={{ padding: '18px 20px' }}
          />
        </div>
        
        <button type="submit" style={{ background: accent, fontWeight: 900, height: '60px', width: '100%', boxShadow: `0 0 25px ${accent}44`, marginTop: '10px' }}>
          SAVE PAYMENT
        </button>
      </form>
    </div>
  );
};

export default BillForm;
