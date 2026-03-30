import React, { useState } from 'react';
import { createAccount } from '../../services/api';

interface MultiStepAccountFormProps {
  onAccountAdded: () => void;
  userId: string;
}

const MultiStepAccountForm: React.FC<MultiStepAccountFormProps> = ({ onAccountAdded, userId }) => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: '',
    type: 'Credit Card',
    customType: '',
    balance: '',
    apr: '0',
    is_bill: false
  });

  const nextStep = () => setStep(step + 1);
  const prevStep = () => setStep(step - 1);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalType = formData.type === 'Custom' ? formData.customType : formData.type;
    
    console.log("Creating Account Capsule:", { 
      user_id: userId,
      name: formData.name,
      type: finalType,
      balance: parseFloat(formData.balance) || 0,
      apr: parseFloat(formData.apr) / 100,
      is_bill: formData.is_bill,
      group_name: 'Staging'
    });

    try {
      await createAccount({ 
        user_id: userId,
        name: formData.name,
        type: finalType,
        balance: parseFloat(formData.balance) || 0,
        apr: parseFloat(formData.apr) / 100,
        is_bill: formData.is_bill,
        group_name: 'Staging'
      });
      console.log("Account created successfully!");
    } catch (err) {
      console.error("API Error creating account:", err);
    }

    setFormData({ name: '', type: 'Credit Card', customType: '', balance: '', apr: '0', is_bill: false });
    setStep(1);
    onAccountAdded();
  };

  return (
    <div className="card" style={{ borderLeft: '4px solid var(--primary)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
        <h3 style={{ margin: 0 }}>Quick Add</h3>
        <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Step {step} of 2</span>
      </div>

      <form onSubmit={handleSubmit}>
        {step === 1 && (
          <div className="step-content">
            <div className="form-group">
              <label>Name</label>
              <input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="e.g. Netflix, Amex Blue" />
            </div>
            <div className="form-group">
              <label>Entry Type</label>
              <select value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})}>
                <option value="Credit Card">Credit Card</option>
                <option value="Bill">Monthly Bill</option>
                <option value="Loan">Personal Loan</option>
                <option value="Savings">Savings/Cash</option>
                <option value="Custom">Other (Custom Type)...</option>
              </select>
            </div>
            {formData.type === 'Custom' && (
              <div className="form-group">
                <label>Custom Type Name</label>
                <input required value={formData.customType} onChange={e => setFormData({...formData, customType: e.target.value})} placeholder="e.g. Crypto, 401k" />
              </div>
            )}
            <button type="button" onClick={nextStep} disabled={!formData.name}>Next Details →</button>
          </div>
        )}

        {step === 2 && (
          <div className="step-content">
            <div className="form-group">
              <label>Current Balance/Amount ($)</label>
              <input type="number" step="0.01" required autoFocus value={formData.balance} onChange={e => setFormData({...formData, balance: e.target.value})} />
            </div>
            <div className="form-group">
              <label>APR (%)</label>
              <input type="number" step="0.01" value={formData.apr} onChange={e => setFormData({...formData, apr: e.target.value})} />
            </div>
            <div className="form-group checkbox">
              <label>
                <input type="checkbox" checked={formData.is_bill} onChange={e => setFormData({...formData, is_bill: e.target.checked})} />
                Include in Monthly Bills?
              </label>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button type="button" onClick={prevStep} style={{ background: '#64748b' }}>← Back</button>
              <button type="submit">Create Capsule</button>
            </div>
          </div>
        )}
      </form>
    </div>
  );
};

export default MultiStepAccountForm;
