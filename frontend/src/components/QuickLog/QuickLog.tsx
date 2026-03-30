import React, { useState } from 'react';
import TransactionForm from '../TransactionForm/TransactionForm';
import { useAuth } from '../../context/AuthContext';
import './QuickLog.css';

interface QuickLogProps {
  accounts: any[];
  budgets: any[];
  onTransactionAdded: () => void;
}

const QuickLog: React.FC<QuickLogProps> = ({ accounts, budgets, onTransactionAdded }) => {
  const [isOpen, setIsOpen] = useState(false);
  const { user } = useAuth();

  const toggleOpen = () => setIsOpen(!isOpen);
  const handleSuccess = () => {
    onTransactionAdded();
    setIsOpen(false);
  };

  if (!user) return null;

  return (
    <>
      <button className={`fab-button ${isOpen ? 'open' : ''}`} onClick={toggleOpen} title="Quick Log Transaction">
        <span>+</span>
      </button>

      {isOpen && (
        <div className="quick-log-overlay" onClick={toggleOpen}>
          <div className="quick-log-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Quick Transaction</h3>
              <button className="close-modal" onClick={toggleOpen}>&times;</button>
            </div>
            <div className="modal-body">
              <TransactionForm 
                accounts={accounts} 
                budgets={budgets} 
                onTransactionAdded={handleSuccess} 
                userId={user.id} 
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default QuickLog;
