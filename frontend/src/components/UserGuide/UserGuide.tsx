import React, { useState, useEffect } from 'react';

interface UserGuideProps {
  guideKey: string;
  title: string;
  children: React.ReactNode;
}

const UserGuide: React.FC<UserGuideProps> = ({ guideKey, title, children }) => {
  const [isVisible, setIsVisible] = useState(true);
  const [isGlobalHidden, setIsGlobalHidden] = useState(localStorage.getItem('saphyr_hide_all_guides') === 'true');

  const checkVisibility = () => {
    const globalHide = localStorage.getItem('saphyr_hide_all_guides') === 'true';
    setIsGlobalHidden(globalHide);

    const hidden = localStorage.getItem(`hide_guide_${guideKey}`);
    if (hidden === 'true' || globalHide) {
      setIsVisible(false);
    } else {
      setIsVisible(true);
    }
  };

  useEffect(() => {
    checkVisibility();
    // Use an interval to sync across the app
    const interval = setInterval(checkVisibility, 1000);
    return () => clearInterval(interval);
  }, [guideKey]);

  const hideGuide = () => {
    localStorage.setItem(`hide_guide_${guideKey}`, 'true');
    setIsVisible(false);
  };

  const showGuide = () => {
    localStorage.removeItem(`hide_guide_${guideKey}`);
    setIsVisible(true);
  };

  if (isGlobalHidden) return null; // Fully hidden if global toggle is on

  if (!isVisible) {
    return (
      <div style={{ textAlign: 'right', marginBottom: '15px' }}>
        <button 
          onClick={showGuide} 
          style={{ 
            width: 'auto', 
            background: 'none', 
            color: 'var(--text-muted)', 
            border: 'none', 
            cursor: 'pointer', 
            fontSize: '0.75rem', 
            textDecoration: 'underline',
            padding: 0,
            boxShadow: 'none',
            marginTop: 0
          }}
        >
          Show {title} Guide
        </button>
      </div>
    );
  }

  return (
    <div className="card" style={{ marginBottom: '25px', background: 'var(--subtle-overlay)', borderColor: 'var(--primary)', textAlign: 'left', position: 'relative', borderLeftWidth: '5px' }}>
      <button 
        onClick={hideGuide} 
        style={{ 
          position: 'absolute', 
          top: '10px', 
          right: '15px', 
          width: 'auto', 
          background: 'none', 
          color: 'var(--primary)', 
          border: 'none', 
          cursor: 'pointer', 
          fontSize: '1.5rem',
          padding: 0,
          marginTop: 0,
          boxShadow: 'none'
        }}
      >
        &times;
      </button>
      <h3 style={{ color: 'var(--primary)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <span style={{ fontSize: '1.2rem' }}>💡</span> {title} Guide
      </h3>
      <div style={{ color: 'var(--text)', fontSize: '0.9rem', lineHeight: '1.6' }}>
        {children}
      </div>
    </div>
  );
};

export default UserGuide;
