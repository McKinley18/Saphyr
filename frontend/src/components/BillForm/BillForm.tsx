import React, { useState } from 'react';
import { createAccount } from '../../services/api';

interface BillFormProps {
  onBillAdded: () => void;
  userId: string;
  groups: string[];
}

const BillForm: React.FC<BillFormProps> = ({ onBillAdded, userId, groups: existingGroups }) => {
  const [isAddingNewGroup, setIsAddingNewGroup] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    type: 'Utility',
    balance: '',
    apr: '',
    loan_term: '',
    group_name: 'Monthly Bills',
    due_day: ''
  });

  // Load custom groups from memory
  const [savedGroups, setSavedGroups] = useState<string[]>(() => {
    const memory = localStorage.getItem(`saphyr_bill_groups_${userId}`);
    return memory ? JSON.parse(memory) : ['Monthly Bills', 'Living Expenses', 'Debt Payments'];
  });

  // Combine unique groups
  const allGroups = Array.from(new Set([...existingGroups, ...savedGroups])).sort();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const finalGroupName = formData.group_name || 'Uncategorized';

      await createAccount({ 
        user_id: userId,
        name: formData.name,
        type: formData.type,
        balance: parseFloat(formData.balance) || 0,
        apr: (parseFloat(formData.apr) || 0) / 100,
        loan_term: parseInt(formData.loan_term) || null,
        is_bill: true,
        group_name: finalGroupName,
        due_day: parseInt(formData.due_day) || null
      });

      // Save to memory
      if (!savedGroups.includes(finalGroupName)) {
        const updated = [...savedGroups, finalGroupName];
        setSavedGroups(updated);
        localStorage.setItem(`saphyr_bill_groups_${userId}`, JSON.stringify(updated));
      }

      setFormData({ ...formData, name: '', balance: '', due_day: '', apr: '', loan_term: '' });
      setIsAddingNewGroup(false);
      onBillAdded();
    } catch (err) {
      console.error("Failed to add bill:", err);
    }
  };

  return (
    <div className="card" style={{ borderLeft: '4px solid #ef4444' }}>
      <h3 style={{ color: 'var(--text)', marginBottom: '20px' }}>Add New Recurring Bill</h3>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Bill Name</label>
          <input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="e.g. Rent, Netflix, Electric" />
        </div>

        <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <div className="form-group">
            <label>Bill Category</label>
            <select value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})}>
              <option value="Utility">Utility</option>
              <option value="Rent/Mortgage">Rent/Mortgage</option>
              <option value="Subscription">Subscription</option>
              <option value="Credit Card">Credit Card Payment</option>
              <option value="Loan">Loan Payment</option>
              <option value="Insurance">Insurance</option>
              <option value="Other">Other</option>
            </select>
          </div>
          <div className="form-group">
            <label>Bill Group</label>
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
                    setFormData({...formData, group_name: allGroups[0] || 'Monthly Bills'});
                  }}
                  style={{ position: 'absolute', right: '5px', top: '5px', padding: '5px 10px', width: 'auto', background: 'none', border: 'none', color: 'var(--text-muted)', boxShadow: 'none' }}
                >&times;</button>
              </div>
            )}
          </div>
        </div>

        <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <div className="form-group">
            <label>Monthly Amount ($)</label>
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
            <label>Due Day (1-31)</label>
            <input 
              type="number" 
              min="1" 
              max="31" 
              required 
              value={formData.due_day} 
              onChange={e => setFormData({...formData, due_day: e.target.value})} 
              placeholder="e.g. 15" 
              autoComplete="off"
            />
          </div>
        </div>

        <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <div className="form-group">
            <label>APR % (If Credit/Loan)</label>
            <input type="number" step="0.01" value={formData.apr} onChange={e => setFormData({...formData, apr: e.target.value})} placeholder="0.00" />
          </div>
          <div className="form-group">
            <label>Loan Term (Months)</label>
            <input type="number" value={formData.loan_term} onChange={e => setFormData({...formData, loan_term: e.target.value})} placeholder="e.g. 60" />
          </div>
        </div>
        
        <button type="submit" style={{ background: '#ef4444' }}>Add Bill to Budget</button>
      </form>
    </div>
  );
};

export default BillForm;
