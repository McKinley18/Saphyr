import React, { useState, useEffect } from 'react';
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
  const [visionQuery, setVisionQuery] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    amount: '',
    category: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
    type: 'expense',
    account_id: '',
    budget_category_id: ''
  });

  // VISION NLP PARSER
  useEffect(() => {
    if (!visionQuery) return;
    
    const query = visionQuery.toLowerCase();
    
    let newAmount = formData.amount;
    let newAccountId = formData.account_id;
    let newBudgetId = formData.budget_category_id;
    let newCategory = formData.category;

    // 1. Parse Amount
    const amountMatch = query.match(/\$?(\d+(\.\d{2})?)/);
    if (amountMatch) newAmount = amountMatch[1];

    // 2. Parse Account
    const accMatch = accounts.find(a => query.includes(a.name.toLowerCase()));
    if (accMatch) newAccountId = accMatch.id;

    // 3. Parse Budget Box
    const budgetMatch = budgets.find(b => query.includes(b.name.toLowerCase()));
    if (budgetMatch) newBudgetId = budgetMatch.id;

    // 4. Heuristic Category if not set
    if (!newCategory) {
      for (const [cat, keywords] of Object.entries(CATEGORY_HEURISTICS)) {
        if (keywords.some(k => query.includes(k))) {
          newCategory = cat;
          const bMatch = budgets.find(b => b.name.toLowerCase().includes(cat.toLowerCase()));
          if (bMatch) newBudgetId = bMatch.id;
          break;
        }
      }
    }

    setFormData(prev => ({
      ...prev,
      amount: newAmount,
      account_id: newAccountId,
      budget_category_id: newBudgetId,
      category: newCategory || prev.category
    }));
  }, [visionQuery, accounts, budgets]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await createTransaction({ ...formData, user_id: userId, amount: parseFloat(formData.amount) });
      setFormData({ amount: '', category: '', description: '', date: new Date().toISOString().split('T')[0], type: 'expense', account_id: '', budget_category_id: '' });
      setVisionQuery('');
      onTransactionAdded();
    } catch (err) { console.error("Transaction failed:", err); }
    finally { setIsSubmitting(false); }
  };

  const accent = customColor || 'var(--primary)';
  const labelStyle = { fontWeight: 900, fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' as const, letterSpacing: '0.12em', marginBottom: '10px', display: 'block' };
  const groupStyle = { display: 'flex', flexDirection: 'column' as const, marginBottom: '30px' };

  return (
    <div className="transaction-form-content">
      <form onSubmit={handleSubmit}>
        {/* VISION ENTRY POINT */}
        <div style={groupStyle}>
          <label style={{ ...labelStyle, color: accent }}>SAPHYR VISION (NLP FORGE)</label>
          <div style={{ position: 'relative' }}>
            <input 
              placeholder="e.g. Log $45.00 for Dinner at Shell on Credit Card" 
              value={visionQuery}
              onChange={e => setVisionQuery(e.target.value)}
              style={{ padding: '20px 25px', border: `2px solid ${accent}`, background: `${accent}05 !important`, fontSize: '1rem', fontWeight: 700 }}
            />
            <div style={{ position: 'absolute', right: '20px', top: '50%', transform: 'translateY(-50%)', opacity: 0.4, fontSize: '1.2rem' }}>✨</div>
          </div>
        </div>

        <div style={{ padding: '20px', background: 'var(--subtle-overlay)', borderRadius: '16px', border: '1px solid var(--border)', marginBottom: '30px' }}>
          {/* ROW 1: AMOUNT & MERCHANT */}
          <div className="grid" style={{ gridTemplateColumns: '1fr 1.5fr', gap: '30px' }}>
            <div style={groupStyle}>
              <label style={labelStyle}>Amount*</label>
              <div className="currency-input-wrapper" style={{ borderColor: formData.amount ? accent : 'var(--border)' }}>
                <span className="currency-prefix" style={{ color: accent, paddingLeft: '20px' }}>$</span>
                <input 
                  required 
                  type="number" 
                  step="0.01" 
                  value={formData.amount} 
                  onChange={e => setFormData({...formData, amount: e.target.value})} 
                  placeholder="0.00"
                  style={{ fontSize: '1.2rem', fontWeight: 900, color: accent, padding: '18px 20px', paddingLeft: '10px' }}
                />
              </div>
            </div>
            <div style={groupStyle}>
              <label style={labelStyle}>Category / Merchant*</label>
              <input 
                required 
                value={formData.category} 
                onChange={e => setFormData({...formData, category: e.target.value})} 
                placeholder="e.g. Walmart, Rent"
                style={{ padding: '18px 20px', borderColor: formData.category ? accent : 'var(--border)' }}
              />
            </div>
          </div>

          {/* ROW 2: ACCOUNT & BUDGET BOX */}
          <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '30px' }}>
            <div style={groupStyle}>
              <label style={labelStyle}>Source Account*</label>
              <select required value={formData.account_id} onChange={e => setFormData({...formData, account_id: e.target.value})} style={{ padding: '18px 20px', borderColor: formData.account_id ? accent : 'var(--border)' }}>
                <option value="">-- Source --</option>
                {accounts.filter(a => !a.is_bill).map(a => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </div>
            <div style={groupStyle}>
              <label style={labelStyle}>Budget Box</label>
              <select value={formData.budget_category_id} onChange={e => setFormData({...formData, budget_category_id: e.target.value})} style={{ padding: '18px 20px', borderColor: formData.budget_category_id ? accent : 'var(--border)' }}>
                <option value="">-- No Box --</option>
                {budgets.map(b => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* ROW 3: DATE */}
          <div style={{ ...groupStyle, marginBottom: 0 }}>
            <label style={labelStyle}>Transaction Date</label>
            <input 
              type="date" 
              value={formData.date} 
              onChange={e => setFormData({...formData, date: e.target.value})} 
              onClick={(e) => (e.currentTarget as any).showPicker?.()}
              style={{ cursor: 'pointer', padding: '18px 20px' }}
            />
          </div>
        </div>

        <button 
          type="submit" 
          disabled={isSubmitting}
          style={{ background: accent, fontWeight: 900, height: '60px', width: '100%', boxShadow: `0 0 25px ${accent}44`, marginTop: '10px' }}
        >
          {isSubmitting ? 'SYNCING...' : 'LOG TRANSACTION'}
        </button>
      </form>
    </div>
  );
};

export default TransactionForm;
