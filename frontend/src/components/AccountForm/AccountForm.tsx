import React, { useState, useEffect } from 'react';
import { createAccount, updateAccount } from '../../services/api';

interface AccountFormProps {
  onAccountAdded: () => void;
  userId: string;
  groups: string[];
  initialData?: any;
  onCancel?: () => void;
}

const AccountForm: React.FC<AccountFormProps> = ({ onAccountAdded, userId, groups: existingGroups, initialData, onCancel }) => {
  const [isAddingNewGroup, setIsAddingNewGroup] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    type: 'Checking',
    balance: '',
    monthly_deposit: '',
    group_name: 'Cash Accounts'
  });

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name || '',
        type: initialData.type || 'Checking',
        balance: initialData.balance?.toString() || '',
        monthly_deposit: initialData.monthly_deposit?.toString() || '',
        group_name: initialData.group_name || 'Cash Accounts'
      });
    } else {
      setFormData({
        name: '',
        type: 'Checking',
        balance: '',
        monthly_deposit: '',
        group_name: 'Cash Accounts'
      });
    }
  }, [initialData]);

  // Load custom groups from memory
  const [savedGroups, setSavedGroups] = useState<string[]>(() => {
    const memory = localStorage.getItem(`saphyr_groups_${userId}`);
    return memory ? JSON.parse(memory) : ['Cash Accounts', 'Savings Accounts', 'Investments'];
  });

  // Combine unique groups
  const allGroups = Array.from(new Set([...existingGroups, ...savedGroups])).sort();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const finalGroupName = formData.group_name || 'Uncategorized';
      const payload = { 
        user_id: userId,
        name: formData.name,
        type: formData.type,
        balance: parseFloat(formData.balance) || 0,
        monthly_deposit: parseFloat(formData.monthly_deposit) || 0,
        is_bill: false,
        group_name: finalGroupName
      };

      if (initialData?.id) {
        await updateAccount(initialData.id, payload);
      } else {
        await createAccount(payload);
      }

      // Save to memory
      if (!savedGroups.includes(finalGroupName)) {
        const updated = [...savedGroups, finalGroupName];
        setSavedGroups(updated);
        localStorage.setItem(`saphyr_groups_${userId}`, JSON.stringify(updated));
      }

      if (!initialData) {
        setFormData({ ...formData, name: '', balance: '', monthly_deposit: '' });
      }
      setIsAddingNewGroup(false);
      onAccountAdded();
    } catch (err) {
      console.error("Failed to save account:", err);
    }
  };

  return (
    <div className="card" style={{ borderLeft: `4px solid ${initialData ? 'var(--primary)' : '#16a34a'}` }}>
      <h3 style={{ color: 'var(--text)', marginBottom: '20px' }}>
        {initialData ? 'EDIT' : 'ADD'} CASH ACCOUNT
      </h3>
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
            <label>Account Group</label>
            {!isAddingNewGroup ? (
              <select 
                value={formData.group_name} 
                onChange={e => {
                  if (e.target.value === 'ADD_NEW') {
                    setIsAddingNewGroup(true);
                    setFormData({...formData, group_name: ''});
                  } else {
                    setFormData({...formData, group_name: e.target.value});
                  }
                }}
              >
                {allGroups.map(g => <option key={g} value={g}>{g}</option>)}
                <option value="ADD_NEW" style={{ fontWeight: 'bold', color: 'var(--primary)' }}>+ Add New Group...</option>
              </select>
            ) : (
              <div style={{ position: 'relative' }}>
                <input 
                  autoFocus 
                  placeholder="New Group Name" 
                  value={formData.group_name} 
                  onChange={e => setFormData({...formData, group_name: e.target.value})} 
                />
                <button 
                  type="button" 
                  onClick={() => {
                    setIsAddingNewGroup(false);
                    setFormData({...formData, group_name: allGroups[0] || 'Cash Accounts'});
                  }}
                  style={{ position: 'absolute', right: '5px', top: '5px', padding: '5px 10px', width: 'auto', background: 'none', border: 'none', color: 'var(--text-muted)', boxShadow: 'none' }}
                >&times;</button>
              </div>
            )}
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
        
        <div style={{ display: 'flex', gap: '10px' }}>
          <button type="submit" style={{ background: initialData ? 'var(--primary)' : '#16a34a' }}>
            {initialData ? 'SAVE CHANGES' : 'CREATE ACCOUNT'}
          </button>
          {initialData && (
            <button 
              type="button" 
              onClick={onCancel}
              style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text)', border: '1px solid var(--border)', boxShadow: 'none' }}
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
