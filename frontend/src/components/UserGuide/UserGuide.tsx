import React, { useState, useEffect } from 'react';

interface UserGuideProps {
  guideKey: string;
  title: string;
  children: React.ReactNode;
}

const UserGuide: React.FC<UserGuideProps> = ({ guideKey, title, children }) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const hidden = localStorage.getItem(`hide_guide_${guideKey}`);
    if (hidden === 'true') {
      setIsVisible(false);
    }
  }, [guideKey]);

  const hideGuide = () => {
    localStorage.setItem(`hide_guide_${guideKey}`, 'true');
    setIsVisible(false);
  };

  const showGuide = () => {
    localStorage.removeItem(`hide_guide_${guideKey}`);
    setIsVisible(true);
  };

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
    <div className="card" style={{ marginBottom: '25px', background: 'rgba(59, 130, 246, 0.05)', borderColor: 'rgba(59, 130, 246, 0.2)', textAlign: 'left', position: 'relative' }}>
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
