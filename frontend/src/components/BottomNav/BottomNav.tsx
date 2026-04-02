import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import './BottomNav.css';

const BottomNav: React.FC = () => {
  const location = useLocation();

  const navItems = [
    { path: '/', label: 'HOME', icon: '⌂' },
    { path: '/accounts', label: 'ACCTS', icon: '💳' },
    { path: '/transactions', label: 'LOGS', icon: '📝' },
    { path: '/income', label: 'CASH', icon: '💰' },
    { path: '/trends', label: 'DATA', icon: '📈' },
  ];

  return (
    <nav className="bottom-nav">
      {navItems.map((item) => (
        <Link
          key={item.path}
          to={item.path}
          className={`bottom-nav-item ${location.pathname === item.path ? 'active' : ''}`}
        >
          <span className="bottom-nav-icon">{item.icon}</span>
          <span className="bottom-nav-label">{item.label}</span>
        </Link>
      ))}
    </nav>
  );
};

export default BottomNav;
