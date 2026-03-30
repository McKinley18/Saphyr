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

      {/* 2. Preferences */}
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

      {/* 3. Security */}
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
