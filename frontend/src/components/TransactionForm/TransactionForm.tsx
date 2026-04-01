import React, { useState } from 'react';
import { createTransaction } from '../../services/api';

interface TransactionFormProps {
  accounts: any[];
  budgets: any[];
  userId: string;
  onTransactionAdded: () => void;
  customColor?: string;
}

const TransactionForm: React.FC<TransactionFormProps> = ({ 
  accounts, budgets, userId, onTransactionAdded, customColor 
}) => {
  const [formData, setFormData] = useState({
    amount: '',
    category: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
    type: 'expense',
    account_id: '',
    budget_category_id: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createTransaction({
        ...formData,
        user_id: userId,
        amount: parseFloat(formData.amount)
      });
      setFormData({
        amount: '',
        category: '',
        description: '',
        date: new Date().toISOString().split('T')[0],
        type: 'expense',
        account_id: '',
        budget_category_id: ''
      });
      onTransactionAdded();
    } catch (err) {
      console.error("Transaction failed:", err);
    }
  };

  const accent = customColor || 'var(--primary)';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <h3 style={{ margin: 0, fontWeight: 900, fontSize: '1.1rem', textAlign: 'center', color: 'var(--text)' }}>QUICK LOG</h3>
      
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div className="grid" style={{ gridTemplateColumns: '1fr 1.5fr', gap: '15px' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Amount</label>
            <div className="currency-input-wrapper" style={{ borderColor: accent }}>
              <span className="currency-prefix" style={{ color: accent }}>$</span>
              <input 
                required 
                type="number" 
                step="0.01" 
                value={formData.amount} 
                onChange={e => setFormData({...formData, amount: e.target.value})} 
                placeholder="0.00"
                style={{ fontSize: '1.2rem', fontWeight: 900, color: accent }}
              />
            </div>
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Category</label>
            <input 
              required 
              value={formData.category} 
              onChange={e => setFormData({...formData, category: e.target.value})} 
              placeholder="e.g. Coffee, Rent"
            />
          </div>
        </div>

        <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Account</label>
            <select required value={formData.account_id} onChange={e => setFormData({...formData, account_id: e.target.value})}>
              <option value="">-- Source --</option>
              {accounts.filter(a => !a.is_bill).map(a => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Budget Box</label>
            <select value={formData.budget_category_id} onChange={e => setFormData({...formData, budget_category_id: e.target.value})}>
              <option value="">-- No Box --</option>
              {budgets.map(b => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="form-group" style={{ marginBottom: 0 }}>
          <label>Date</label>
          <input 
            type="date" 
            value={formData.date} 
            onChange={e => setFormData({...formData, date: e.target.value})} 
            onClick={(e) => (e.currentTarget as any).showPicker?.()}
            style={{ cursor: 'pointer' }}
          />
        </div>

        <button type="submit" style={{ background: accent, fontWeight: 900 }}>LOG TRANSACTION</button>
      </form>
    </div>
  );
};

export default TransactionForm;
