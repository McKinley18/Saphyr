import React, { useState, useEffect } from 'react';
import { createAccount, updateAccount } from '../../services/api';

interface AccountFormProps {
  onAccountAdded: () => void;
  userId: string;
  groups: string[];
  initialData?: any;
  onCancel?: () => void;
  customColor?: string;
}

const AccountForm: React.FC<AccountFormProps> = ({ 
  onAccountAdded, userId, groups, initialData, onCancel, customColor 
}) => {
  const [formData, setFormData] = useState({
    name: '',
    type: 'Checking',
    balance: '',
    group_name: '',
    is_bill: false,
    monthly_deposit: ''
  });

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name,
        type: initialData.type,
        balance: initialData.balance.toString(),
        group_name: initialData.group_name || '',
        is_bill: !!initialData.is_bill,
        monthly_deposit: initialData.monthly_deposit?.toString() || ''
      });
    }
  }, [initialData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (initialData) {
        await updateAccount(initialData.id, formData);
      } else {
        await createAccount({ ...formData, user_id: userId });
      }
      setFormData({ name: '', type: 'Checking', balance: '', group_name: '', is_bill: false, monthly_deposit: '' });
      onAccountAdded();
    } catch (err) {
      console.error("Account operation failed:", err);
    }
  };

  const accent = customColor || 'var(--primary)';

  const labelStyle = { 
    fontWeight: 900, 
    fontSize: '0.75rem', 
    color: 'var(--text-muted)', 
    textTransform: 'uppercase' as const, 
    letterSpacing: '0.12em',
    marginBottom: '10px', // Spacing between title and its box
    display: 'block'
  };

  const groupStyle = {
    display: 'flex',
    flexDirection: 'column' as const,
    marginBottom: '30px' // Equal space between box units
  };

  return (
    <div className="account-form-symmetrical">
      <form onSubmit={handleSubmit}>
        
        {/* ROW 1: FULL WIDTH DESCRIPTION */}
        <div style={groupStyle}>
          <label style={labelStyle}>Account Description</label>
          <input 
            required 
            value={formData.name} 
            onChange={e => setFormData({...formData, name: e.target.value})} 
            placeholder="e.g. Primary Checking"
          />
        </div>

        {/* ROW 2: TYPE & BALANCE */}
        <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '30px' }}>
          <div style={groupStyle}>
            <label style={labelStyle}>Asset Type</label>
            <select value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})}>
              <option value="Checking">Checking</option>
              <option value="Savings">Savings</option>
              <option value="Cash Accounts">Cash</option>
              <option value="Investment">Investment</option>
            </select>
          </div>
          <div style={groupStyle}>
            <label style={labelStyle}>Current Balance</label>
            <div className="currency-input-wrapper">
              <span className="currency-prefix" style={{ color: accent }}>$</span>
              <input 
                required 
                type="number" 
                step="0.01" 
                value={formData.balance} 
                onChange={e => setFormData({...formData, balance: e.target.value})} 
                placeholder="0.00"
              />
            </div>
          </div>
        </div>

        {/* ROW 3: CATEGORY & INFLOW */}
        <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '30px' }}>
          <div style={groupStyle}>
            <label style={labelStyle}>Category (Group)</label>
            <input 
              list="account-groups"
              value={formData.group_name} 
              onChange={e => setFormData({...formData, group_name: e.target.value})} 
              placeholder="e.g. Personal"
            />
            <datalist id="account-groups">
              {(groups || []).map(g => <option key={g} value={g} />)}
            </datalist>
          </div>
          <div style={groupStyle}>
            <label style={labelStyle}>Monthly Inflow</label>
            <div className="currency-input-wrapper">
              <span className="currency-prefix" style={{ color: accent }}>$</span>
              <input 
                type="number" 
                step="0.01" 
                value={formData.monthly_deposit} 
                onChange={e => setFormData({...formData, monthly_deposit: e.target.value})} 
                placeholder="0.00"
              />
            </div>
          </div>
        </div>

        {/* ACTION BUTTONS (NO BOTTOM MARGIN) */}
        <div style={{ display: 'flex', gap: '15px', marginTop: '10px' }}>
          <button type="submit" style={{ flex: 2, height: '60px', background: accent, boxShadow: `0 0 20px ${accent}44` }}>
            {initialData ? 'SAVE CHANGES' : 'CREATE ACCOUNT'}
          </button>
          {onCancel && (
            <button 
              type="button" 
              onClick={onCancel}
              style={{ flex: 1, height: '60px', background: 'rgba(255,255,255,0.05)', color: 'var(--text)', border: '1px solid var(--border)', boxShadow: 'none' }}
            >
              CANCEL
            </button>
          )}
        </div>
      </form>
    </div>
  );
};

export default AccountForm;
