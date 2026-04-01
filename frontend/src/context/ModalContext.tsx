import React, { createContext, useContext, useState, useCallback } from 'react';

interface ModalOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDanger?: boolean;
}

interface ModalContextType {
  confirm: (options: ModalOptions) => Promise<boolean>;
}

const ModalContext = createContext<ModalContextType | undefined>(undefined);

export const ModalProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    options: ModalOptions;
    resolve: (value: boolean) => void;
  } | null>(null);

  const confirm = useCallback((options: ModalOptions) => {
    return new Promise<boolean>((resolve) => {
      setModalState({
        isOpen: true,
        options: {
          ...options,
          confirmLabel: options.confirmLabel || 'CONFIRM',
          cancelLabel: options.cancelLabel || 'CANCEL'
        },
        resolve
      });
    });
  }, []);

  const handleClose = (value: boolean) => {
    if (modalState) {
      modalState.resolve(value);
      setModalState(null);
    }
  };

  return (
    <ModalContext.Provider value={{ confirm }}>
      {children}
      {modalState && modalState.isOpen && (
        <div className="modal-overlay" onClick={() => handleClose(false)}>
          <div 
            className="modal-card card" 
            onClick={e => e.stopPropagation()}
            style={{ 
              border: `2px solid ${modalState.options.isDanger ? 'var(--danger)' : 'var(--primary)'}`,
              boxShadow: `0 0 40px ${modalState.options.isDanger ? 'rgba(239, 68, 68, 0.2)' : 'rgba(59, 130, 246, 0.2)'}`,
              animation: 'modalScale 0.25s cubic-bezier(0.2, 0.8, 0.2, 1)'
            }}
          >
            <h3 style={{ color: modalState.options.isDanger ? 'var(--danger)' : 'var(--primary)', textAlign: 'center', marginBottom: '15px' }}>
              {modalState.options.title.toUpperCase()}
            </h3>
            <p style={{ textAlign: 'center', color: 'var(--text)', lineHeight: '1.6', marginBottom: '30px', fontSize: '0.95rem' }}>
              {modalState.options.message}
            </p>
            <div style={{ display: 'flex', gap: '15px' }}>
              <button 
                onClick={() => handleClose(false)}
                style={{ 
                  flex: 1, 
                  background: 'none', 
                  border: '1px solid var(--border)', 
                  color: 'var(--text-muted)',
                  boxShadow: 'none'
                }}
              >
                {modalState.options.cancelLabel?.toUpperCase()}
              </button>
              <button 
                onClick={() => handleClose(true)}
                style={{ 
                  flex: 1, 
                  background: modalState.options.isDanger ? 'var(--danger)' : 'var(--primary)',
                  fontWeight: 900
                }}
              >
                {modalState.options.confirmLabel?.toUpperCase()}
              </button>
            </div>
          </div>
          <style>{`
            .modal-overlay {
              position: fixed;
              top: 0;
              left: 0;
              right: 0;
              bottom: 0;
              background: rgba(0, 0, 0, 0.85);
              backdrop-filter: blur(8px);
              display: flex;
              align-items: center;
              justify-content: center;
              z-index: 10000;
              padding: 20px;
            }
            .modal-card {
              max-width: 450px;
              width: 100%;
              padding: 40px !important;
              background: var(--bg) !important;
            }
            @keyframes modalScale {
              from { opacity: 0; transform: scale(0.95) translateY(10px); }
              to { opacity: 1; transform: scale(1) translateY(0); }
            }
          `}</style>
        </div>
      )}
    </ModalContext.Provider>
  );
};

export const useModal = () => {
  const context = useContext(ModalContext);
  if (!context) throw new Error('useModal must be used within a ModalProvider');
  return context;
};
