import React, { useState } from 'react';

interface BillSimulatorProps {
  bills: any[];
}

const BillSimulator: React.FC<BillSimulatorProps> = ({ bills }) => {
  const [selectedBillIds, setSelectedBillIds] = useState<string[]>([]);
  const [hypotheticalPayment, setHypotheticalPayment] = useState<string>('');

  const safeFormat = (val: any) => {
    const num = parseFloat(val || '0');
    return isNaN(num) ? '0.00' : num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const toggleBill = (id: string) => {
    setSelectedBillIds(prev => 
      prev.includes(id) ? prev.filter(bid => bid !== id) : [...prev, id]
    );
  };

  const selectedBills = bills.filter(b => selectedBillIds.includes(b.id));
  const totalSelectedBalance = selectedBills.reduce((sum, b) => sum + Math.abs(parseFloat(b.balance || '0')), 0);
  const paymentValue = parseFloat(hypotheticalPayment) || 0;
  
  // Advanced logic for compatible bills
  const compatibleBills = selectedBills.filter(b => b.apr > 0 && b.loan_term > 0);
  
  const totalMonthlyInterestSaved = compatibleBills.reduce((sum, b) => {
    const balance = Math.abs(parseFloat(b.balance));
    const apr = parseFloat(b.apr);
    // Interest savings = (Extra Payment * APR) / 12 (Simplified for 1 month)
    // But let's show total interest impact
    const monthlyRate = apr / 12;
    return sum + (paymentValue * monthlyRate);
  }, 0);

  const remainingAfterPayment = Math.max(0, totalSelectedBalance - paymentValue);

  return (
    <div className="card" style={{ borderLeft: '5px solid var(--warning)', background: 'rgba(245, 158, 11, 0.02)' }}>
      <h3 style={{ color: 'var(--warning)', margin: '0 0 10px 0', fontSize: '1.1rem', fontWeight: 800 }}>LOAN & INTEREST SIMULATOR</h3>
      <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '20px' }}>
        Select bills to see how extra payments reduce your interest and shorten your term.
      </p>

      <div style={{ marginBottom: '25px' }}>
        <label style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Extra Payment Amount ($)</label>
        <input 
          type="number" 
          placeholder="e.g. 500.00" 
          value={hypotheticalPayment} 
          onChange={e => setHypotheticalPayment(e.target.value)}
          style={{ marginTop: '5px', fontSize: '1.2rem', fontWeight: 900, border: '2px solid var(--warning)', borderRadius: '12px' }}
        />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '250px', overflowY: 'auto', paddingRight: '5px', marginBottom: '25px' }}>
        {bills.length === 0 ? (
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textAlign: 'center' }}>No bills found.</p>
        ) : (
          bills.map(bill => {
            const isCompatible = bill.apr > 0 && bill.loan_term > 0;
            return (
              <div 
                key={bill.id} 
                onClick={() => toggleBill(bill.id)}
                style={{ 
                  padding: '12px 15px', 
                  borderRadius: '12px', 
                  background: selectedBillIds.includes(bill.id) ? 'rgba(245, 158, 11, 0.1)' : 'rgba(255,255,255,0.02)',
                  border: `1px solid ${selectedBillIds.includes(bill.id) ? 'var(--warning)' : 'var(--border)'}`,
                  cursor: 'pointer',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  opacity: isCompatible || selectedBillIds.length === 0 || selectedBillIds.includes(bill.id) ? 1 : 0.5
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ 
                    width: '18px', 
                    height: '18px', 
                    borderRadius: '5px', 
                    border: '2px solid var(--warning)',
                    background: selectedBillIds.includes(bill.id) ? 'var(--warning)' : 'transparent',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontSize: '0.6rem'
                  }}>
                    {selectedBillIds.includes(bill.id) ? '✓' : ''}
                  </div>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '0.85rem' }}>{bill.name}</div>
                    {isCompatible ? (
                      <div style={{ fontSize: '0.65rem', color: 'var(--warning)', fontWeight: 700 }}>
                        {bill.loan_term}mo @ {(bill.apr * 100).toFixed(2)}% APR
                      </div>
                    ) : (
                      <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>No terms set</div>
                    )}
                  </div>
                </div>
                <div style={{ fontWeight: 800, fontSize: '0.9rem' }} className="currency negative">${safeFormat(bill.balance)}</div>
              </div>
            );
          })
        )}
      </div>

      {selectedBillIds.length > 0 && (
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>Principal Reduced:</span>
            <span style={{ fontWeight: 800, color: 'var(--success)' }}>-${safeFormat(paymentValue)}</span>
          </div>

          {compatibleBills.length > 0 && paymentValue > 0 && (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', background: 'rgba(34, 197, 94, 0.05)', padding: '10px', borderRadius: '8px', border: '1px dashed var(--success)' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--success)' }}>Monthly Interest Saved:</span>
                <span style={{ fontWeight: 900, color: 'var(--success)' }}>+${safeFormat(totalMonthlyInterestSaved)}</span>
              </div>
              
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontStyle: 'italic', textAlign: 'center' }}>
                By paying extra toward the principal, you reduce the base used for interest calculations.
              </div>
            </>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg)', padding: '15px', borderRadius: '12px', marginTop: '5px' }}>
            <span style={{ fontSize: '0.9rem', fontWeight: 800 }}>New Balance:</span>
            <span style={{ fontSize: '1.25rem', fontWeight: 900, color: remainingAfterPayment > 0 ? 'var(--danger)' : 'var(--success)' }} className="currency">
              ${safeFormat(remainingAfterPayment)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default BillSimulator;
