import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const CommandDeck: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const navigate = useNavigate();
  const { togglePrivacyMode, toggleEditMode, logout } = useAuth();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(prev => !prev);
      }
      if (e.key === 'Escape') setIsOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const commands = [
    { id: 'dash', label: 'Go to Dashboard', icon: '◰', action: () => navigate('/') },
    { id: 'income', label: 'Go to Income', icon: '⚡', action: () => navigate('/income') },
    { id: 'vault', label: 'Go to Vault', icon: '🛡', action: () => navigate('/accounts') },
    { id: 'bills', label: 'Go to Obligations', icon: '🗓', action: () => navigate('/bills') },
    { id: 'forge', label: 'Go to Forge', icon: '⚒', action: () => navigate('/transactions') },
    { id: 'trends', label: 'Go to Trends', icon: '📈', action: () => navigate('/trends') },
    { id: 'settings', label: 'Go to Settings', icon: '⚙', action: () => navigate('/settings') },
    { id: 'privacy', label: 'Toggle Privacy Mode', icon: '👁', action: () => togglePrivacyMode() },
    { id: 'edit', label: 'Toggle Architect Mode', icon: '✎', action: () => toggleEditMode() },
    { id: 'logout', label: 'Sign Out', icon: '×', action: () => logout() }
  ];

  const filtered = commands.filter(c => c.label.toLowerCase().includes(query.toLowerCase()));

  if (!isOpen) return null;

  return (
    <div className="command-deck-overlay" onClick={() => setIsOpen(false)}>
      <div className="command-deck-modal" onClick={e => e.stopPropagation()}>
        <div className="command-deck-header">
          <span style={{ fontSize: '1.2rem', marginRight: '10px' }}>⚡</span>
          <input 
            autoFocus 
            placeholder="TYPE A COMMAND..." 
            value={query} 
            onChange={e => setQuery(e.target.value)}
          />
        </div>
        <div className="command-deck-list">
          {filtered.map(c => (
            <div key={c.id} className="command-item" onClick={() => { c.action(); setIsOpen(false); }}>
              <span className="command-icon">{c.icon}</span>
              <span className="command-label">{c.label}</span>
              <span className="command-shortcut">↵</span>
            </div>
          ))}
          {filtered.length === 0 && (
            <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
              NO COMMANDS MATCHING "{query.toUpperCase()}"
            </div>
          )}
        </div>
      </div>

      <style>{`
        .command-deck-overlay {
          position: fixed; top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(0,0,0,0.8); backdrop-filter: blur(8px);
          z-index: 9999; display: flex; align-items: flex-start; justify-content: center;
          padding-top: 15vh;
        }
        .command-deck-modal {
          width: 100%; max-width: 600px;
          background: var(--card); border: 2px solid var(--primary);
          border-radius: 20px; overflow: hidden; box-shadow: 0 0 50px rgba(59, 130, 246, 0.4);
          animation: slideDown 0.2s ease-out;
        }
        .command-deck-header {
          padding: 25px; border-bottom: 2px solid var(--border);
          display: flex; align-items: center; background: rgba(59, 130, 246, 0.05);
        }
        .command-deck-header input {
          background: transparent !important; border: none !important;
          font-size: 1.1rem; font-weight: 900; color: var(--text);
          box-shadow: none !important; padding: 0 !important;
        }
        .command-deck-list { max-height: 400px; overflow-y: auto; padding: 10px; }
        .command-item {
          display: flex; align-items: center; padding: 15px 20px;
          border-radius: 12px; cursor: pointer; transition: all 0.2s ease;
          gap: 15px; margin-bottom: 5px;
        }
        .command-item:hover { background: var(--primary-gradient); color: white; }
        .command-icon { font-size: 1.2rem; width: 30px; text-align: center; }
        .command-label { flex: 1; font-weight: 800; font-size: 0.9rem; }
        .command-shortcut { opacity: 0.5; font-size: 0.8rem; }
        @keyframes slideDown {
          from { transform: translateY(-20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default CommandDeck;
