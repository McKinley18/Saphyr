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

  return (
    <div className="card" style={{ borderTop: `4px solid ${accent}`, borderLeft: `5px solid ${accent}`, background: 'var(--subtle-overlay)', padding: '35px', position: 'relative' }}>
      {renderColorPicker && renderColorPicker()}
      <h3 style={{ margin: '0 0 25px 0', fontSize: '1.1rem', fontWeight: 900, textAlign: 'center', color: 'var(--text)' }}>ADD PAYMENT</h3>
      
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label>Description*</label>
          <input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="e.g. Rent, Car Loan" />
        </div>

        <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Payment*</label>
            <div className="currency-input-wrapper">
              <span className="currency-prefix" style={{ color: accent }}>$</span>
              <input required type="number" step="0.01" value={formData.balance} onChange={e => setFormData({...formData, balance: e.target.value})} placeholder="0.00" />
            </div>
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Due Date*</label>
            <div className="currency-input-wrapper" style={{ position: 'relative' }}>
              <input 
                required 
                type="number" 
                min="1" 
                max="31" 
                value={formData.due_day} 
                onChange={e => setFormData({...formData, due_day: e.target.value})} 
                placeholder="1-31" 
                style={{ paddingRight: '45px' }}
              />
              <span 
                onClick={() => (document.getElementById('bill-date-helper') as any)?.showPicker()}
                style={{ position: 'absolute', right: '12px', cursor: 'pointer', fontSize: '1.1rem', opacity: 0.6 }}
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

        <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Category</label>
            <input list="bill-groups" value={formData.group_name} onChange={e => setFormData({...formData, group_name: e.target.value})} placeholder="e.g. Housing" />
            <datalist id="bill-groups">
              {groups.map(g => <option key={g} value={g} />)}
            </datalist>
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>APR (%)</label>
            <input type="number" step="0.01" value={formData.apr} onChange={e => setFormData({...formData, apr: e.target.value})} placeholder="e.g. 5.5" />
          </div>
        </div>

        <div className="form-group" style={{ marginBottom: 0 }}>
          <label>Total Loan Term (Months)</label>
          <input type="number" value={formData.loan_term} onChange={e => setFormData({...formData, loan_term: e.target.value})} placeholder="e.g. 60" />
        </div>
        
        <button type="submit" style={{ background: accent, fontWeight: 900, boxShadow: `0 0 20px ${accent}` }}>SAVE PAYMENT</button>
      </form>
    </div>
  );
};

export default BillForm;
