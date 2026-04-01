import React, { useState } from 'react';
import { createTransaction } from '../../services/api';

interface TransactionFormProps {
  accounts: any[];
  budgets: any[];
  userId: string;
  onTransactionAdded: () => void;
  customColor?: string;
}

const CATEGORY_HEURISTICS: Record<string, string[]> = {
  'Groceries': ['walmart', 'target', 'kroger', 'safeway', 'publix', 'whole foods', 'trader joe', 'aldi', 'costco', 'wegmans', 'heb', 'h-e-b', 'meijer', 'food lion', 'vons'],
  'Gas': ['shell', 'chevron', 'exxon', 'mobil', 'bp', 'sunoco', 'valero', 'marathon', 'citgo', 'phillips 66', 'texaco', 'quik trip', 'wawa', 'speedway'],
  'Dining': ['mcdonald', 'starbucks', 'subway', 'wendy', 'burger king', 'taco bell', 'dunkin', 'pizza hut', 'domino', 'chipotle', 'kfc', 'sonic', 'panera', 'chick-fil-a'],
  'Entertainment': ['netflix', 'spotify', 'hulu', 'disney+', 'apple tv', 'hbo max', 'amazon prime', 'peacock', 'paramount+', 'amc+', 'youtube', 'twitch', 'steam', 'playstation', 'xbox', 'nintendo'],
  'Utilities': ['duke energy', 'con edison', 'pg&e', 'southern company', 'dominion', 'fpl', 'aep', 'pseg', 'national grid', 'xcel', 'eversource', 'pge', 'edison', 'water', 'electric', 'gas'],
  'Transportation': ['uber', 'lyft', 'uber eats', 'doordash', 'postmates', 'grubhub', 'instacart', 'seamless', 'lime', 'bird', 'spin', 'jump']
};

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

  const handleCategoryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const lowerValue = value.toLowerCase();
    
    let suggestedBudgetId = formData.budget_category_id;
    
    // Run heuristic engine if a budget hasn't been manually forced yet
    if (!suggestedBudgetId || suggestedBudgetId === '') {
      for (const [budgetType, keywords] of Object.entries(CATEGORY_HEURISTICS)) {
        if (keywords.some(k => lowerValue.includes(k))) {
          // Find matching budget box by name
          const match = budgets.find(b => b.name.toLowerCase().includes(budgetType.toLowerCase()));
          if (match) {
            suggestedBudgetId = match.id;
            break;
          }
        }
      }
    }

    setFormData({
      ...formData, 
      category: value,
      budget_category_id: suggestedBudgetId
    });
  };

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
            <div className="currency-input-wrapper">
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
            <label>Category / Merchant</label>
            <input 
              required 
              value={formData.category} 
              onChange={handleCategoryChange} 
              placeholder="e.g. Walmart, Rent"
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
