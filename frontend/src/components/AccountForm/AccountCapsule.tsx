import React from 'react';
import { useDraggable } from '@dnd-kit/core';

interface AccountCapsuleProps {
  account: any;
}

const AccountCapsule: React.FC<AccountCapsuleProps> = ({ account }) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: account.id,
    data: account
  });

  const style = {
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    opacity: isDragging ? 0.5 : 1,
    cursor: 'grab',
    padding: '8px 16px',
    background: '#ffffff',
    border: '1px solid var(--border)',
    borderRadius: '20px',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '10px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
    margin: '5px',
    fontSize: '0.85rem',
    zIndex: isDragging ? 1000 : 1,
    whiteSpace: 'nowrap' as const
  };

  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes}>
      <span style={{ color: '#64748b', fontWeight: 'bold' }}>⠿</span>
      <strong>{account.name}</strong>
      <span style={{ color: '#2563eb' }}>${parseFloat(account.balance).toLocaleString()}</span>
      <span style={{ fontSize: '0.7rem', color: '#94a3b8', background: '#f1f5f9', padding: '2px 6px', borderRadius: '10px' }}>
        {account.type}
      </span>
    </div>
  );
};

export default AccountCapsule;
