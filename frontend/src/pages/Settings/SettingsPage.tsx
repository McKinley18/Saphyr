import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { updatePassword, deleteAccountApi } from '../../services/api';

const SettingsPage: React.FC = () => {
  const { user, logout, isPrivacyMode, togglePrivacyMode } = useAuth();
  const [passwords, setPasswords] = useState({ current: '', new: '', confirm: '' });
  const [message, setMessage] = useState({ text: '', type: '' });
  const [loading, setLoading] = useState(false);
  
  const [hideGuides, setHideGuides] = useState(
    localStorage.getItem('saphyr_hide_all_guides') === 'true'
  );

  const defaultTabs = [
    { path: '/', label: 'Dashboard' },
    { path: '/income', label: 'Income' },
    { path: '/accounts', label: 'Accounts' },
    { path: '/bills', label: 'Bills' },
    { path: '/transactions', label: 'Transactions' },
    { path: '/trends', label: 'Trends' },
    { path: '/settings', label: 'Settings' },
  ];

  const [orderedTabs, setOrderedTabs] = useState(() => {
    const saved = localStorage.getItem('saphyr_tab_order');
    if (saved) {
      const paths = JSON.parse(saved);
      return paths.map((path: string) => defaultTabs.find(t => t.path === path)).filter(Boolean);
    }
    return defaultTabs;
  });

  const moveTab = (index: number, direction: 'up' | 'down') => {
    const newTabs = [...orderedTabs];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newTabs.length) return;

    const [moved] = newTabs.splice(index, 1);
    newTabs.splice(targetIndex, 0, moved);
    
    setOrderedTabs(newTabs);
    localStorage.setItem('saphyr_tab_order', JSON.stringify(newTabs.map(t => t.path)));
  };

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage({ text: '', type: '' });

    if (passwords.new !== passwords.confirm) {
      return setMessage({ text: 'New passwords do not match', type: 'error' });
    }

    if (passwords.new.length < 6) {
      return setMessage({ text: 'Password must be at least 6 characters', type: 'error' });
    }

    setLoading(true);
    try {
      const data = await updatePassword({
        currentPassword: passwords.current,
        newPassword: passwords.new
      });

      if (data.error) {
        setMessage({ text: data.error, type: 'error' });
      } else {
        setMessage({ text: 'Password updated successfully!', type: 'success' });
        setPasswords({ current: '', new: '', confirm: '' });
      }
    } catch (err) {
      setMessage({ text: 'Failed to update password', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const toggleGuides = () => {
    const newValue = !hideGuides;
    setHideGuides(newValue);
    localStorage.setItem('saphyr_hide_all_guides', newValue.toString());
    setMessage({ text: 'Guide preferences saved! Refresh any page to see changes.', type: 'success' });
  };

  const handleDeleteAccount = async () => {
    const confirm1 = window.confirm("WARNING: This will permanently delete your account and all financial data. This cannot be undone. Proceed?");
    if (confirm1) {
      const confirm2 = window.confirm("Final confirmation: Are you ABSOLUTELY sure?");
      if (confirm2) {
        try {
          await deleteAccountApi();
          alert("Account deleted. We're sorry to see you go!");
          logout();
        } catch (err) {
          alert("Failed to delete account. Please try again later.");
        }
      }
    }
  };

  return (
    <div className="settings-page" style={{ maxWidth: '600px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <h2 style={{ margin: 0 }}>Settings</h2>

      {message.text && (
        <div className="card" style={{ 
          background: message.type === 'error' ? 'rgba(244, 63, 94, 0.1)' : 'rgba(34, 197, 94, 0.1)',
          color: message.type === 'error' ? 'var(--danger)' : 'var(--success)',
          padding: '15px',
          textAlign: 'center',
          fontWeight: 700,
          borderRadius: '16px',
          border: `1px solid ${message.type === 'error' ? 'var(--danger)' : 'var(--success)'}`
        }}>
          {message.type === 'success' ? '✅ ' : '⚠️ '} {message.text}
        </div>
      )}

      {/* 1. Account Info */}
      <div className="card">
        <h3 style={{ color: 'var(--text)', marginBottom: '15px' }}>Account Information</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase', fontWeight: 700 }}>Signed in as</div>
          <div style={{ fontWeight: 800, fontSize: '1.1rem' }}>{user?.full_name || 'User'}</div>
          <div style={{ color: 'var(--primary)', fontWeight: 600 }}>{user?.email}</div>
        </div>
      </div>

      {/* 2. Privacy & Peace of Mind */}
      <div className="card" style={{ borderLeft: '5px solid var(--success)', background: 'rgba(34, 197, 94, 0.02)' }}>
        <h3 style={{ color: 'var(--success)', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span>🛡️</span> Privacy & Peace of Mind
        </h3>
        <div style={{ fontSize: '0.9rem', lineHeight: '1.6', color: 'var(--text)' }}>
          <p style={{ marginBottom: '10px' }}><strong>Saphyr is a 100% manual tracker.</strong></p>
          <ul style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <li>We <strong>never</strong> ask for bank logins, account numbers, or SSNs.</li>
            <li>Your data is isolated to your private account and encrypted in transit.</li>
            <li>Since no real accounts are linked, your actual financial assets are never at risk.</li>
          </ul>
        </div>
      </div>

      {/* 3. Install App */}
      <div className="card" style={{ borderLeft: '5px solid var(--primary)' }}>
        <h3 style={{ color: 'var(--primary)', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span>📲</span> Install Saphyr
        </h3>
        <div style={{ fontSize: '0.9rem', lineHeight: '1.6', color: 'var(--text)' }}>
          <p style={{ marginBottom: '15px' }}>Save Saphyr to your home screen or desktop for a full-screen, native app experience.</p>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <div style={{ padding: '12px', background: 'rgba(59, 130, 246, 0.05)', borderRadius: '12px', border: '1px solid var(--border)' }}>
              <strong style={{ display: 'block', marginBottom: '5px', fontSize: '0.8rem', textTransform: 'uppercase' }}>For iPhone / Safari</strong>
              <div style={{ fontSize: '0.85rem' }}>Tap the <strong>Share</strong> button (box with arrow) and scroll down to <strong>"Add to Home Screen."</strong></div>
            </div>
            
            <div style={{ padding: '12px', background: 'rgba(59, 130, 246, 0.05)', borderRadius: '12px', border: '1px solid var(--border)' }}>
              <strong style={{ display: 'block', marginBottom: '5px', fontSize: '0.8rem', textTransform: 'uppercase' }}>For Android / Chrome</strong>
              <div style={{ fontSize: '0.85rem' }}>Tap the <strong>Three Dots</strong> in the corner and select <strong>"Install App"</strong> or <strong>"Add to Home Screen."</strong></div>
            </div>

            <div style={{ padding: '12px', background: 'rgba(59, 130, 246, 0.05)', borderRadius: '12px', border: '1px solid var(--border)' }}>
              <strong style={{ display: 'block', marginBottom: '5px', fontSize: '0.8rem', textTransform: 'uppercase' }}>For Desktop (Chrome/Edge)</strong>
              <div style={{ fontSize: '0.85rem' }}>Look for the <strong>Install Icon</strong> (a small computer with an arrow) in your browser's address bar.</div>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Rearrange Navigation */}
      <div className="card" style={{ borderLeft: '5px solid #10b981' }}>
        <h3 style={{ color: '#10b981', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span>↕️</span> Rearrange Navigation
        </h3>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '20px' }}>Customise the order of your menu tabs. Changes apply instantly.</p>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {orderedTabs.map((tab: any, index: number) => (
            <div key={tab.path} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 20px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid var(--border)' }}>
              <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>{tab.label}</span>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button 
                  onClick={() => moveTab(index, 'up')}
                  disabled={index === 0}
                  style={{ width: '40px', padding: '8px', background: 'rgba(255,255,255,0.05)', color: 'var(--text)', boxShadow: 'none', marginTop: 0 }}
                >↑</button>
                <button 
                  onClick={() => moveTab(index, 'down')}
                  disabled={index === orderedTabs.length - 1}
                  style={{ width: '40px', padding: '8px', background: 'rgba(255,255,255,0.05)', color: 'var(--text)', boxShadow: 'none', marginTop: 0 }}
                >↓</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 5. Preferences */}
      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <h3 style={{ color: 'var(--text)', margin: 0 }}>App Preferences</h3>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontWeight: 700 }}>Privacy Mode (Incognito)</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Mask all financial balances with ••••</div>
          </div>
          <button 
            onClick={togglePrivacyMode}
            style={{ 
              width: 'auto', 
              background: isPrivacyMode ? 'var(--primary)' : 'rgba(255,255,255,0.05)',
              color: isPrivacyMode ? 'white' : 'var(--text)',
              padding: '8px 20px',
              fontSize: '0.85rem'
            }}
          >
            {isPrivacyMode ? 'Enabled' : 'Disabled'}
          </button>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border)', paddingTop: '20px' }}>
          <div>
            <div style={{ fontWeight: 700 }}>Hide Instruction Boxes</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Disable all "💡 Guide" boxes across the app.</div>
          </div>
          <button 
            onClick={toggleGuides}
            style={{ 
              width: 'auto', 
              background: hideGuides ? 'var(--primary)' : 'rgba(255,255,255,0.05)',
              color: hideGuides ? 'white' : 'var(--text)',
              padding: '8px 20px',
              fontSize: '0.85rem'
            }}
          >
            {hideGuides ? 'Enabled' : 'Disabled'}
          </button>
        </div>
      </div>

      {/* 5. Security */}
      <div className="card">
        <h3 style={{ color: 'var(--text)', marginBottom: '20px' }}>Security & Password</h3>
        <form onSubmit={handlePasswordUpdate}>
          <div className="form-group">
            <label>Current Password</label>
            <input 
              type="password" 
              required 
              value={passwords.current} 
              onChange={e => setPasswords({...passwords, current: e.target.value})} 
            />
          </div>
          <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
            <div className="form-group">
              <label>New Password</label>
              <input 
                type="password" 
                required 
                value={passwords.new} 
                onChange={e => setPasswords({...passwords, new: e.target.value})} 
              />
            </div>
            <div className="form-group">
              <label>Confirm New</label>
              <input 
                type="password" 
                required 
                value={passwords.confirm} 
                onChange={e => setPasswords({...passwords, confirm: e.target.value})} 
              />
            </div>
          </div>
          <button type="submit" disabled={loading}>
            {loading ? 'Updating...' : 'Update Password'}
          </button>
        </form>
      </div>

      {/* 4. Danger Zone */}
      <div className="card" style={{ border: '1px solid var(--danger)', background: 'rgba(244, 63, 94, 0.02)' }}>
        <h3 style={{ color: 'var(--danger)', marginBottom: '15px' }}>Danger Zone</h3>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '20px' }}>Once you delete your account, there is no going back. Please be certain.</p>
        <button 
          onClick={handleDeleteAccount}
          style={{ background: 'rgba(244, 63, 94, 0.1)', color: 'var(--danger)', border: '1px solid var(--danger)', boxShadow: 'none' }}
        >
          Permanently Delete My Account
        </button>
      </div>
    </div>
  );
};

export default SettingsPage;
