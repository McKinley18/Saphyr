import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import './Navbar.css';
import { useAuth } from '../../context/AuthContext';

interface NavbarProps {
  theme: string;
  setTheme: (theme: string) => void;
}

const Navbar: React.FC<NavbarProps> = ({ theme, setTheme }) => {
  const { user, logout, isEditMode, toggleEditMode, lockVault, hasVaultPin } = useAuth();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [isThemeOpen, setIsThemeOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const themeRef = useRef<HTMLDivElement>(null);

  const toggleMenu = () => setIsOpen(!isOpen);
  const closeMenu = () => setIsOpen(false);

  const getPageTitle = (path: string) => {
    switch (path) {
      case '/': return 'DASHBOARD';
      case '/income': return 'INCOME';
      case '/accounts': return 'ACCOUNTS';
      case '/bills': return 'BILLS';
      case '/transactions': return 'TRANSACTIONS';
      case '/trends': return 'TRENDS';
      case '/settings': return 'SETTINGS';
      default: return 'SAPHYR';
    }
  };

  const navOptions = [
    { path: '/', label: 'Dashboard' },
    { path: '/income', label: 'Income' },
    { path: '/accounts', label: 'Accounts' },
    { path: '/bills', label: 'Bills' },
    { path: '/transactions', label: 'Transactions' },
    { path: '/trends', label: 'Trends' },
    { path: '/settings', label: 'Settings' }
  ];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) setIsOpen(false);
      if (themeRef.current && !themeRef.current.contains(event.target as Node)) setIsThemeOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!user) return null;

  return (
    <nav className="navbar">
      <div className="navbar-container">
        {/* ROW 1: BRANDING & CONTROL HUB */}
        <div className="nav-row primary-row">
          <div className="nav-group-left">
            <Link to="/" className="navbar-logo" onClick={closeMenu}>
              <div className="logo-container bigger"><div className="logo-icon"></div></div>
              <span className="brand-name bigger">SAPHYR</span>
            </Link>
          </div>
          
          <div className="nav-group-right">
            {/* VAULT LOCK */}
            {hasVaultPin && (
              <button 
                className="lock-vault-btn" 
                onClick={lockVault}
                style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', padding: '5px', marginRight: '10px', boxShadow: 'none' }}
                title="Lock Saphyr Vault"
              >
                🔒
              </button>
            )}

            {/* MASTER ARCHITECT TOGGLE */}
            <button 
              className={`architect-btn ${isEditMode ? 'active' : ''}`} 
              onClick={toggleEditMode}
              title="Architect Mode (Edit Layout/Colors)"
            >
              {isEditMode ? 'DONE' : 'EDIT'}
            </button>
            
            <div className="theme-dropdown-container" ref={themeRef}>
              <button className="theme-trigger-v2" onClick={() => setIsThemeOpen(!isThemeOpen)}>
                {theme.toUpperCase()}
              </button>
              {isThemeOpen && (
                <div className="theme-menu card">
                  {['LIGHT', 'DARK', 'OLED'].map(mode => (
                    <button key={mode} onClick={() => { setTheme(mode.toLowerCase()); setIsThemeOpen(false); }} className={`theme-opt ${theme === mode.toLowerCase() ? 'active' : ''}`}>
                      {mode} {theme === mode.toLowerCase() && '✓'}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="menu-dropdown-wrapper" ref={menuRef}>
              <button className={`hamburger ${isOpen ? 'open' : ''}`} onClick={toggleMenu} aria-label="Menu">
                <span className="hamburger-box"><span className="hamburger-inner"></span></span>
              </button>
              
              {isOpen && (
                <div className="navbar-dropdown-menu card">
                  <div className="dropdown-links">
                    <div className="dropdown-user-info">
                      <label>SIGNED IN AS</label>
                      <div className="dropdown-user-name">{user.full_name || user.email}</div>
                    </div>
                    
                    {navOptions.map(opt => (
                      <Link key={opt.path} to={opt.path} className={`dropdown-link ${location.pathname === opt.path ? 'active' : ''}`} onClick={closeMenu}>
                        {opt.label}
                      </Link>
                    ))}
                    
                    <button onClick={() => { closeMenu(); logout(); }} className="dropdown-sign-out">SIGN OUT</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ROW 2: CENTERED CONTEXT */}
        <div className="nav-row secondary-row centered">
          <div className="page-title-row">{getPageTitle(location.pathname)}</div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
