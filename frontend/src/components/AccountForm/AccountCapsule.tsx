import React from 'react';

interface AccountCapsuleProps {
  name: string;
  type: string;
  balance: number;
}

const AccountCapsule: React.FC<AccountCapsuleProps> = ({ name, type, balance }) => {
  const safeFormat = (val: number) => {
    return val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  return (
    <div className="card highlight-hover" style={{ 
      padding: '15px 20px', 
      display: 'flex', 
      justifyContent: 'space-between', 
      alignItems: 'center',
      background: 'var(--card)',
      border: '2px solid var(--border)',
      borderRadius: '16px',
      marginBottom: '10px',
      transition: 'all 0.2s ease'
    }}>
      <div>
        <div style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--text)' }}>{name}</div>
        <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '2px' }}>
          {type}
        </div>
      </div>
      <div style={{ textAlign: 'right' }}>
        <div className="currency" style={{ fontWeight: 900, fontSize: '1.1rem', color: balance >= 0 ? 'var(--success)' : 'var(--danger)' }}>
          ${safeFormat(balance)}
        </div>
      </div>
    </div>
  );
};

export default AccountCapsule;
