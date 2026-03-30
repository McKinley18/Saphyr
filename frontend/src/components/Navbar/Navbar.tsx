import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import './Navbar.css';
import { useAuth } from '../../context/AuthContext';

interface NavbarProps {
  theme: string;
  toggleTheme: () => void;
}

const Navbar: React.FC<NavbarProps> = ({ theme, toggleTheme }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);

  const toggleMenu = () => setIsOpen(!isOpen);
  const closeMenu = () => setIsOpen(false);

  // Define default tabs
  const defaultTabs = [
    { path: '/', label: 'Dashboard' },
    { path: '/income', label: 'Income' },
    { path: '/accounts', label: 'Accounts' },
    { path: '/bills', label: 'Bills' },
    { path: '/transactions', label: 'Transactions' },
    { path: '/trends', label: 'Trends' },
    { path: '/settings', label: 'Settings' },
  ];

  // Get saved order or use default
  const [tabs, setTabs] = useState(() => {
    const saved = localStorage.getItem('saphyr_tab_order');
    if (saved) {
      try {
        const orderedPaths = JSON.parse(saved);
        return orderedPaths.map((path: string) => defaultTabs.find(t => t.path === path)).filter(Boolean);
      } catch (e) {
        return defaultTabs;
      }
    }
    return defaultTabs;
  });

  // Sync tabs if they change elsewhere (like Settings)
  useEffect(() => {
    const handleStorage = () => {
      const saved = localStorage.getItem('saphyr_tab_order');
      if (saved) {
        const orderedPaths = JSON.parse(saved);
        setTabs(orderedPaths.map((path: string) => defaultTabs.find(t => t.path === path)).filter(Boolean));
      }
    };
    window.addEventListener('storage', handleStorage);
    const interval = setInterval(handleStorage, 2000);
    return () => {
      window.removeEventListener('storage', handleStorage);
      clearInterval(interval);
    };
  }, []);

  const handleShare = async () => {
    const shareData = {
      title: 'Saphyr Finance Tracker',
      text: 'Check out Saphyr, a premium personal finance tracker. Track your taxes, assets, and spending with a high-end UI!',
      url: window.location.origin
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(window.location.origin);
        alert('App link copied to clipboard!');
      }
    } catch (err) {
      console.log('Error sharing:', err);
    }
  };

  if (!user) return null;

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link to="/" className="navbar-logo" onClick={closeMenu}>
          <div className="logo-icon"></div>
          <div className="logo-text">
            <span className="brand-name">Saphyr</span>
            <span className="brand-divider"></span>
            <span className="brand-tagline">Financial Tracker</span>
          </div>
        </Link>
        
        <div className="navbar-right">
          <button className="theme-toggle" onClick={toggleTheme} title="Toggle Theme">
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>

          <button className={`hamburger ${isOpen ? 'open' : ''}`} onClick={toggleMenu} aria-label="Menu">
            <span className="hamburger-box">
              <span className="hamburger-inner"></span>
            </span>
          </button>
        </div>

        <div className={`navbar-menu ${isOpen ? 'open' : ''}`}>
          <div className="menu-links">
            <div className="user-profile" style={{ padding: '10px 20px', borderBottom: '1px solid var(--border)', marginBottom: '10px' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Signed in as</div>
              <div style={{ fontWeight: 800, color: 'var(--text)', fontSize: '0.9rem', marginTop: '4px' }}>{user.full_name || user.email}</div>
            </div>
            
            {tabs.map((tab: any) => (
              <Link 
                key={tab.path} 
                to={tab.path} 
                className={`nav-link ${location.pathname === tab.path ? 'active' : ''}`} 
                onClick={closeMenu}
              >
                {tab.label}
              </Link>
            ))}
            
            <div style={{ marginTop: 'auto', paddingTop: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button 
                onClick={handleShare} 
                style={{ 
                  background: 'rgba(59, 130, 246, 0.1)', 
                  color: 'var(--primary)', 
                  border: '1px solid rgba(59, 130, 246, 0.2)',
                  boxShadow: 'none',
                  fontSize: '0.85rem',
                  fontWeight: 700
                }}
              >
                📤 Share Saphyr
              </button>
              <button 
                onClick={() => {
                  closeMenu();
                  logout();
                }} 
                style={{ 
                  background: 'rgba(244, 63, 94, 0.1)', 
                  color: 'var(--danger)', 
                  border: '1px solid rgba(244, 63, 94, 0.2)',
                  boxShadow: 'none',
                  fontSize: '0.85rem',
                  fontWeight: 700
                }}
              >
                🚪 Sign Out
              </button>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
