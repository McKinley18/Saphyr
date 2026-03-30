import React, { useState } from 'react';
import { createAccount } from '../../services/api';

interface AccountFormProps {
  onAccountAdded: () => void;
  userId: string;
  groups: string[];
}

const AccountForm: React.FC<AccountFormProps> = ({ onAccountAdded, userId, groups }) => {
  const [formData, setFormData] = useState({
    name: '',
    type: 'Checking',
    balance: '',
    monthly_deposit: '',
    group_name: 'Cash Accounts'
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createAccount({ 
        user_id: userId,
        name: formData.name,
        type: formData.type,
        balance: parseFloat(formData.balance) || 0,
        monthly_deposit: parseFloat(formData.monthly_deposit) || 0,
        is_bill: false, // Accounts tab is now ONLY for non-bills
        group_name: formData.group_name || 'Uncategorized'
      });
      setFormData({ ...formData, name: '', balance: '', monthly_deposit: '' });
      onAccountAdded();
    } catch (err) {
      console.error("Failed to add account:", err);
    }
  };

  return (
    <div className="card" style={{ borderLeft: '4px solid #16a34a' }}>
      <h3>Add Cash Account</h3>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Account Name</label>
          <input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="e.g. Primary Checking" />
        </div>

        <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <div className="form-group">
            <label>Type</label>
            <select value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})}>
              <option value="Checking">Checking</option>
              <option value="Savings">Savings</option>
              <option value="Cash">Physical Cash</option>
              <option value="Investment">Investment</option>
              <option value="Other">Other</option>
            </select>
          </div>
          <div className="form-group">
            <label>Group</label>
            <input list="account-groups" value={formData.group_name} onChange={e => setFormData({...formData, group_name: e.target.value})} />
            <datalist id="account-groups">
              {groups.map(g => <option key={g} value={g} />)}
              <option value="Cash Accounts" />
              <option value="Savings Accounts" />
            </datalist>
          </div>
        </div>

        <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <div className="form-group">
            <label>Current Balance ($)</label>
            <input 
              type="number" 
              step="0.01" 
              required 
              value={formData.balance} 
              onChange={e => setFormData({...formData, balance: e.target.value})} 
              autoComplete="off"
            />
          </div>
          <div className="form-group">
            <label>Monthly Deposit ($)</label>
            <input 
              type="number" 
              step="0.01" 
              value={formData.monthly_deposit} 
              onChange={e => setFormData({...formData, monthly_deposit: e.target.value})} 
              placeholder="0.00" 
              autoComplete="off"
            />
          </div>
        </div>
        
        <button type="submit" style={{ background: '#16a34a' }}>Create Account</button>
      </form>
    </div>
  );
};

export default AccountForm;
