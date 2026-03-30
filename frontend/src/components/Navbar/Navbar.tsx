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

  if (!user) return null;

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link to="/" className="navbar-logo" onClick={closeMenu}>
          <div className="logo-icon"></div>
          <div className="logo-text">
            <span className="brand-name">Saphyr</span>
            <span className="brand-divider"></span>
            <span className="brand-tagline">Finance Tracker</span>
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
            
            <Link to="/" className={`nav-link ${location.pathname === '/' ? 'active' : ''}`} onClick={closeMenu}>Dashboard</Link>
            <Link to="/income" className={`nav-link ${location.pathname === '/income' ? 'active' : ''}`} onClick={closeMenu}>Income</Link>
            <Link to="/accounts" className={`nav-link ${location.pathname === '/accounts' ? 'active' : ''}`} onClick={closeMenu}>Accounts</Link>
            <Link to="/bills" className={`nav-link ${location.pathname === '/bills' ? 'active' : ''}`} onClick={closeMenu}>Bills</Link>
            <Link to="/transactions" className={`nav-link ${location.pathname === '/transactions' ? 'active' : ''}`} onClick={closeMenu}>Transactions</Link>
            <Link to="/trends" className={`nav-link ${location.pathname === '/trends' ? 'active' : ''}`} onClick={closeMenu}>Trends</Link>
            
            <button 
              onClick={logout} 
              style={{ 
                marginTop: '20px', 
                background: 'rgba(244, 63, 94, 0.1)', 
                color: 'var(--danger)', 
                border: '1px solid rgba(244, 63, 94, 0.2)',
                boxShadow: 'none'
              }}
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
