import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import './Navbar.css';
import { useAuth } from '../../context/AuthContext';

interface NavbarProps {
  theme: string;
  toggleTheme: () => void;
}

const Navbar: React.FC<NavbarProps> = ({ theme, toggleTheme }) => {
  const { user, logout, isEditMode, toggleEditMode } = useAuth();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const toggleMenu = () => setIsOpen(!isOpen);
  const closeMenu = () => setIsOpen(false);

  // Close menu on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Define all available tabs
  const allTabs = [
    { path: '/', label: 'Dashboard' },
    { path: '/income', label: 'Income' },
    { path: '/accounts', label: 'Accounts' },
    { path: '/bills', label: 'Bills' },
    { path: '/transactions', label: 'Transactions' },
    { path: '/trends', label: 'Trends' },
    { path: '/settings', label: 'Settings' },
  ];

  const visibleTabs = user?.visible_tabs;
  const filteredTabs = Array.isArray(visibleTabs) && visibleTabs.length > 0
    ? allTabs.filter(tab => visibleTabs.includes(tab.path))
    : allTabs;

  if (!user) return null;

  return (
    <>
      <nav className="navbar" ref={menuRef}>
        <div className="navbar-container">
          <Link to="/" className="navbar-logo" onClick={closeMenu}>
            <div className="logo-container">
              <div className="logo-icon"></div>
            </div>
            <div className="logo-text">
              <span className="brand-name">Saphyr</span>
              <span className="brand-divider"></span>
              <span className="brand-tagline">Financial Tracker</span>
            </div>
          </Link>
          
          <div className="navbar-right">
            {isEditMode && (
              <button 
                className={`edit-mode-toggle active`}
                onClick={toggleEditMode}
                style={{ 
                  width: '65px', 
                  height: '32px',
                  background: 'var(--primary)',
                  color: 'white',
                  padding: 0,
                  fontSize: '0.7rem',
                  fontWeight: 800,
                  marginRight: '10px',
                  boxShadow: '0 0 15px var(--primary)',
                  marginTop: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '8px',
                  border: isEditMode ? '1px solid var(--primary)' : '1px solid var(--border)',
                  letterSpacing: '0.05em',
                  boxSizing: 'border-box'
                }}
              >
                DONE
              </button>
            )}
            <button 
              className="theme-toggle" 
              onClick={toggleTheme}
              style={{ 
                width: '65px', 
                height: '32px',
                fontSize: '0.7rem', 
                fontWeight: 800, 
                padding: 0, 
                borderRadius: '8px',
                letterSpacing: '0.05em',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid var(--border)',
                color: 'var(--text)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginTop: 0,
                boxSizing: 'border-box'
              }}
            >
              {theme === 'light' ? 'DARK' : theme === 'dark' ? 'OLED' : 'LIGHT'}
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
              
              {filteredTabs.map((tab: any) => (
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
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        </div>
      </nav>
    </>
  );
};

export default Navbar;
