import React, { useState } from 'react';
import { createTransaction } from '../../services/api';

interface TransactionFormProps {
  accounts: any[];
  budgets: any[];
  onTransactionAdded: () => void;
  userId: string;
}

const TransactionForm: React.FC<TransactionFormProps> = ({ accounts, budgets, onTransactionAdded, userId }) => {
  const [formData, setFormData] = useState({
    account_id: '',
    budget_category_id: '',
    type: 'expense',
    amount: '',
    category: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
  });

  // Safe formatting helper
  const safeFormat = (val: any) => {
    const num = parseFloat(val || '0');
    return isNaN(num) ? '0.00' : num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const cashAccounts = (accounts || []).filter(acc => 
    acc && (['Checking', 'Savings', 'Cash Accounts'].includes(acc.type) || acc.group_name === 'Cash Accounts')
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      await createTransaction({ 
        user_id: userId,
        account_id: formData.account_id,
        budget_category_id: formData.budget_category_id || null,
        type: formData.type,
        amount: parseFloat(formData.amount),
        category: formData.category,
        description: formData.description,
        date: formData.date,
      });
      setFormData({ ...formData, amount: '', description: '', category: '', budget_category_id: '' });
      onTransactionAdded();
    } catch (err) {
      console.error("Failed to add transaction:", err);
    }
  };

  return (
    <div className="card">
      <h3>Log Transaction</h3>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Transaction Type</label>
          <select value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value })}>
            <option value="expense">Purchase / Outflow</option>
            <option value="income">Deposit / Inflow</option>
          </select>
        </div>

        <div className="form-group">
          <label>{formData.type === 'income' ? 'Destination Account' : 'Source Account'}</label>
          <select required value={formData.account_id} onChange={(e) => setFormData({ ...formData, account_id: e.target.value })}>
            <option value="">Select Account</option>
            {cashAccounts.map((acc) => (
              <option key={acc.id} value={acc.id}>
                {acc.name} (${safeFormat(acc.balance)})
              </option>
            ))}
          </select>
        </div>

        {formData.type === 'expense' && (
          <div className="form-group">
            <label>Link to Budget Box (Optional)</label>
            <select value={formData.budget_category_id} onChange={(e) => setFormData({ ...formData, budget_category_id: e.target.value })}>
              <option value="">No Budget Link</option>
              {budgets.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>
        )}

        <div className="form-group">
          <label>Amount ($)</label>
          <input type="number" step="0.01" required value={formData.amount} onChange={(e) => setFormData({ ...formData, amount: e.target.value })} autoComplete="off" />
        </div>

        <div className="form-group">
          <label>Category / Vendor</label>
          <input type="text" required value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })} placeholder="e.g. Walmart, Side Job" />
        </div>

        <div className="form-group">
          <label>Description (Optional)</label>
          <input type="text" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
        </div>

        <div className="form-group">
          <label>Date</label>
          <input type="date" required value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} />
        </div>

        <button type="submit" style={{ background: formData.type === 'income' ? '#16a34a' : 'var(--primary)' }}>
          {formData.type === 'income' ? 'Log Deposit' : 'Log Purchase'}
        </button>
      </form>
    </div>
  );
};

export default TransactionForm;
