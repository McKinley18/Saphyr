import React, { useState } from 'react';
import { createAccount } from '../../services/api';

interface BillFormProps {
  onBillAdded: () => void;
  userId: string;
  groups: string[];
}

const BillForm: React.FC<BillFormProps> = ({ onBillAdded, userId, groups }) => {
  const [formData, setFormData] = useState({
    name: '',
    type: 'Utility',
    balance: '',
    apr: '',
    group_name: 'Monthly Bills',
    due_day: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createAccount({ 
        user_id: userId,
        name: formData.name,
        type: formData.type,
        balance: parseFloat(formData.balance) || 0,
        apr: (parseFloat(formData.apr) || 0) / 100,
        is_bill: true,
        group_name: formData.group_name || 'Uncategorized',
        due_day: parseInt(formData.due_day) || null
      });
      setFormData({ ...formData, name: '', balance: '', due_day: '', apr: '' });
      onBillAdded();
    } catch (err) {
      console.error("Failed to add bill:", err);
    }
  };

  return (
    <div className="card" style={{ borderLeft: '4px solid #ef4444' }}>
      <h3>Add New Recurring Bill</h3>
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
            <label>Group</label>
            <input list="bill-groups" value={formData.group_name} onChange={e => setFormData({...formData, group_name: e.target.value})} />
            <datalist id="bill-groups">
              {groups.map(g => <option key={g} value={g} />)}
              <option value="Monthly Bills" />
              <option value="Living Expenses" />
              <option value="Debt Payments" />
            </datalist>
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

        <div className="form-group">
          <label>APR % (If Credit/Loan)</label>
          <input type="number" step="0.01" value={formData.apr} onChange={e => setFormData({...formData, apr: e.target.value})} placeholder="0.00" />
        </div>
        
        <button type="submit" style={{ background: '#ef4444' }}>Add Bill to Budget</button>
      </form>
    </div>
  );
};

export default BillForm;
