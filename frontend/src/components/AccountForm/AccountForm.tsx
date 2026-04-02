import React, { useState, useEffect } from 'react';
import { createAccount, updateAccount } from '../../services/api';

interface AccountFormProps {
  onAccountAdded: () => void;
  userId: string;
  groups: string[];
  initialData?: any;
  onCancel?: () => void;
  customColor?: string;
  renderColorPicker?: () => React.ReactNode;
}

const AccountForm: React.FC<AccountFormProps> = ({ 
  onAccountAdded, userId, groups, initialData, onCancel, customColor, renderColorPicker 
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

  return (
    <div className="card" style={{ borderTop: `4px solid ${accent}`, borderLeft: `5px solid ${accent}`, background: 'var(--subtle-overlay)', padding: '35px', position: 'relative' }}>
      {renderColorPicker && renderColorPicker()}
      <h3 style={{ margin: '0 0 25px 0', fontSize: '1.1rem', fontWeight: 900, textAlign: 'center', color: 'var(--text)' }}>
        {initialData ? 'EDIT ACCOUNT' : 'ADD CASH ACCOUNT'}
      </h3>
      
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label>Account Name</label>
          <input 
            required 
            value={formData.name} 
            onChange={e => setFormData({...formData, name: e.target.value})} 
            placeholder="e.g. Primary Checking"
          />
        </div>

        <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Type</label>
            <select value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})}>
              <option value="Checking">Checking</option>
              <option value="Savings">Savings</option>
              <option value="Cash Accounts">Cash</option>
              <option value="Investment">Investment</option>
            </select>
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Balance</label>
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

        <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Category (Group)</label>
            <input 
              list="account-groups"
              value={formData.group_name} 
              onChange={e => setFormData({...formData, group_name: e.target.value})} 
              placeholder="e.g. Personal"
            />
            <datalist id="account-groups">
              {groups.map(g => <option key={g} value={g} />)}
            </datalist>
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Monthly Inflow</label>
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

        <div style={{ display: 'flex', gap: '15px', marginTop: '10px' }}>
          <button type="submit" style={{ flex: 2, background: accent, boxShadow: `0 0 20px ${accent}` }}>
            {initialData ? 'SAVE CHANGES' : 'CREATE ACCOUNT'}
          </button>
          {onCancel && (
            <button 
              type="button" 
              onClick={onCancel}
              style={{ flex: 1, background: 'rgba(255,255,255,0.05)', color: 'var(--text)', border: '1px solid var(--border)', boxShadow: 'none' }}
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
