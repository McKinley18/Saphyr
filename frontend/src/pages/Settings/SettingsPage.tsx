import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useModal } from '../../context/ModalContext';
import { 
  updatePassword, 
  deleteAccountApi, 
  resetAccountApi, 
  fetchTransactions, 
  fetchAccounts
} from '../../services/api';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

const SettingsPage: React.FC = () => {
  const { user, logout, isPrivacyMode, togglePrivacyMode, isEditMode, toggleEditMode, updateUserPreferences, setVaultPin, hasVaultPin } = useAuth();
  const { confirm } = useModal();
  const [passwords, setPasswords] = useState({ current: '', new: '', confirm: '' });
  const [vaultPinInput, setVaultPinInput] = useState('');
  const [identity, setIdentity] = useState({ email: user?.email || '', full_name: user?.full_name || '' });
  const [message, setMessage] = useState({ text: '', type: '' });
  const [loading, setLoading] = useState(false);
  
  const [isPasswordExpanded, setIsPasswordExpanded] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isDangerExpanded, setIsDangerExpanded] = useState(false);
  const [is2FAExpanded, setIs2FAExpanded] = useState(false);
  const [totpSetup, setTotpSetup] = useState<{ secret: string; qrCode: string } | null>(null);
  const [totpCode, setTotpCode] = useState('');

  const handleSetupTOTP = async () => {
    try {
      const res = await fetch('/api/auth/totp/setup', { method: 'POST' });
      const data = await res.json();
      setTotpSetup(data);
    } catch (err) {
      setMessage({ text: 'TOTP setup failed', type: 'error' });
    }
  };

  const handleVerifyTOTP = async () => {
    try {
      const res = await fetch('/api/auth/totp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: totpCode })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setMessage({ text: 'TOTP ENABLED!', type: 'success' });
      setTotpSetup(null);
      setTotpCode('');
      setTimeout(() => window.location.reload(), 1500);
    } catch (err: any) {
      setMessage({ text: err.message, type: 'error' });
    }
  };

  const handleDisableTOTP = async () => {
    const confirmDisable = await confirm({
      title: 'Disable Authenticator App',
      message: 'This will reduce your account security. Are you sure?',
      confirmLabel: 'DISABLE TOTP',
      isDanger: true
    });

    if (confirmDisable) {
      try {
        await fetch('/api/auth/totp/disable', { method: 'POST' });
        setMessage({ text: 'TOTP DISABLED', type: 'success' });
        setTimeout(() => window.location.reload(), 1500);
      } catch (err) {
        setMessage({ text: 'Failed to disable TOTP', type: 'error' });
      }
    }
  };
  const [isIdentityExpanded, setIsIdentityExpanded] = useState(false);
  
  const [hideGuides, setHideGuides] = useState(
    localStorage.getItem('saphyr_hide_all_guides') === 'true'
  );

  const ACCENT_COLORS = [
    { name: 'Sapphire', color: '#3b82f6' },
    { name: 'Emerald', color: '#10b981' },
    { name: 'Amethyst', color: '#8b5cf6' },
    { name: 'Ruby', color: '#f43f5e' },
    { name: 'Amber', color: '#f59e0b' },
    { name: 'Cyan', color: '#06b6d4' },
    { name: 'Rose', color: '#fb7185' },
    { name: 'Slate', color: '#64748b' }
  ];

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage({ text: '', type: '' });
    if (passwords.new !== passwords.confirm) return setMessage({ text: 'New passwords do not match', type: 'error' });
    if (passwords.new.length < 8) return setMessage({ text: 'Password must be at least 8 characters', type: 'error' });
    if (!/[A-Z]/.test(passwords.new) || !/[0-9]/.test(passwords.new)) return setMessage({ text: 'Password must contain an uppercase letter and a number', type: 'error' });

    setLoading(true);
    try {
      const data = await updatePassword({ currentPassword: passwords.current, newPassword: passwords.new });
      if (data.error) { setMessage({ text: data.error, type: 'error' }); } 
      else { setMessage({ text: 'Password updated successfully!', type: 'success' }); setPasswords({ current: '', new: '', confirm: '' }); setIsPasswordExpanded(false); }
    } catch (err) { setMessage({ text: 'Failed to update password', type: 'error' }); } 
    finally { setLoading(false); }
  };

  const handleIdentityUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await updateUserPreferences({ email: identity.email, full_name: identity.full_name });
      setMessage({ text: 'Identity updated successfully!', type: 'success' });
      setIsIdentityExpanded(false);
    } catch (err) {
      setMessage({ text: 'Failed to update identity', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const toggleGuides = () => {
    const newValue = !hideGuides;
    setHideGuides(newValue);
    localStorage.setItem('saphyr_hide_all_guides', newValue.toString());
    setMessage({ text: `Help Guides ${newValue ? 'Disabled' : 'Enabled'}`, type: 'success' });
  };

  const handleDeleteAccount = async () => {
    const isConfirmed = await confirm({
      title: 'Delete Account',
      message: 'This will permanently erase your entire financial history and identity. This action is IRREVERSIBLE. Are you absolutely sure?',
      confirmLabel: 'DELETE EVERYTHING',
      isDanger: true
    });

    if (isConfirmed) {
      try {
        await deleteAccountApi();
        logout();
      } catch (err) {
        setMessage({ text: 'Delete failed. Please try again.', type: 'error' });
      }
    }
  };

  const handleResetAccount = async () => {
    const isConfirmed = await confirm({
      title: 'Reset All Data',
      message: 'This will zero out all transactions, accounts, and budgets while keeping your login. Proceed?',
      confirmLabel: 'RESET DATA',
      isDanger: true
    });

    if (isConfirmed) {
      try {
        await resetAccountApi();
        setMessage({ text: 'Account data has been zeroed out.', type: 'success' });
        setIsDangerExpanded(false);
        setTimeout(() => window.location.reload(), 1500); 
      } catch (err) {
        setMessage({ text: 'Reset failed.', type: 'error' });
      }
    }
  };

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      const offset = 100;
      const bodyRect = document.body.getBoundingClientRect().top;
      const elementRect = element.getBoundingClientRect().top;
      window.scrollTo({ top: elementRect - bodyRect - offset, behavior: 'smooth' });
    }
  };

  const handleExportCSV = async () => {
    try {
      const [accounts, transactions] = await Promise.all([fetchAccounts(), fetchTransactions()]);
      const headers = ['Date', 'Category', 'Description', 'Amount', 'Type', 'Account'];
      const rows = (transactions || []).map((tx: any) => [
        tx.date ? tx.date.split('T')[0] : '', `"${tx.category}"`, `"${tx.description || ''}"`, tx.amount, tx.type,
        `"${accounts.find((a: any) => a.id === tx.account_id)?.name || 'Unknown'}"`
      ]);
      const csvContent = [headers.join(','), ...rows.map((row: any[]) => row.join(','))].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.setAttribute('href', URL.createObjectURL(blob));
      link.setAttribute('download', `saphyr_export_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setMessage({ text: 'Data exported!', type: 'success' });
    } catch (err) { setMessage({ text: 'Export failed', type: 'error' }); }
  };

  const handleExportPDF = async () => {
    try {
      const [accounts, transactions] = await Promise.all([fetchAccounts(), fetchTransactions()]);
      const doc = new jsPDF();
      doc.setFontSize(22); doc.setTextColor(59, 130, 246);
      doc.text('SAPHYR FINANCIAL STATEMENT', 105, 20, { align: 'center' });
      doc.setFontSize(10); doc.setTextColor(100, 116, 139);
      doc.text(`Generated on: ${new Date().toLocaleString()}`, 105, 30, { align: 'center' });
      doc.setFontSize(16); doc.setTextColor(0, 0, 0);
      doc.text('Account Balances', 14, 45);
      const accountData = (accounts || []).map((a: any) => [a.name, a.type, `${user?.currency_symbol || '$'}${parseFloat(a.balance).toLocaleString()}`]);
      autoTable(doc, { startY: 50, head: [['Account Name', 'Type', 'Balance']], body: accountData, theme: 'striped', headStyles: { fillColor: [59, 130, 246] } });
      const lastY = (doc as any).lastAutoTable.finalY || 50;
      doc.text('Transaction History', 14, lastY + 20);
      const txData = (transactions || []).slice(0, 50).map((tx: any) => [tx.date ? tx.date.split('T')[0] : '', tx.category, tx.description || '', `${tx.type === 'expense' ? '-' : '+'}${user?.currency_symbol || '$'}${parseFloat(tx.amount).toLocaleString()}`]);
      autoTable(doc, { startY: lastY + 25, head: [['Date', 'Category', 'Description', 'Amount']], body: txData, theme: 'grid', headStyles: { fillColor: [59, 130, 246] } });
      doc.save(`saphyr_statement_${new Date().toISOString().split('T')[0]}.pdf`);
      setMessage({ text: 'Statement generated!', type: 'success' });
    } catch (err) { setMessage({ text: 'PDF failed', type: 'error' }); }
  };

  const menuItems = [
    { id: 'philosophy', label: 'Philosophy & Privacy' },
    { id: 'preferences', label: 'Account Preferences' },
    { id: 'security', label: 'Account Security' },
    { id: 'data', label: 'Data & Portability' },
  ];

  return (
    <div className="settings-page">
      <div className="settings-container" style={{ display: 'flex', maxWidth: '1000px', margin: '0 auto', textAlign: 'left' }}>
        
        {/* SIDEBAR */}
        <div className="settings-nav-container">
          <div style={{ padding: '0 10px 20px 10px', borderBottom: '1px solid var(--border)', marginBottom: '20px' }}>
            <div style={{ fontWeight: 900, fontSize: '1.2rem', color: 'var(--primary)', letterSpacing: '-0.02em' }}>SETTINGS</div>
            <div className="sidebar-user-label" style={{ fontSize: '0.75rem', color: 'var(--text)', fontWeight: 800, marginTop: '8px', textTransform: 'uppercase', letterSpacing: '0.05em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user?.full_name || 'USER'}
            </div>
          </div>
          {menuItems.map(item => (
            <button key={item.id} onClick={() => scrollToSection(item.id)} className="sidebar-link" style={{ background: 'none', border: 'none', textAlign: 'left', padding: '12px 15px', borderRadius: '12px', color: 'var(--text)', fontSize: '0.9rem', fontWeight: 700, cursor: 'pointer', boxShadow: 'none', width: '100%', marginTop: 0 }}>
              {item.label}
            </button>
          ))}
        </div>

        <div className="settings-content" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '30px', paddingBottom: '100px', paddingLeft: '40px' }}>
          {message.text && (
            <div style={{ background: 'var(--bg)', color: message.type === 'error' ? 'var(--danger)' : 'var(--success)', padding: '15px', textAlign: 'center', fontWeight: 800, borderRadius: '12px', border: `2px solid ${message.type === 'error' ? 'var(--danger)' : 'var(--success)'}`, fontSize: '0.8rem' }}>
              {message.text.toUpperCase()}
            </div>
          )}

          {/* SECTION 1: PHILOSOPHY & PRIVACY */}
          <section id="philosophy">
            <h2 style={{ fontSize: '1.5rem', fontWeight: 900, marginBottom: '25px', borderBottom: '2px solid var(--primary)', paddingBottom: '10px', textAlign: 'center' }}>PHILOSOPHY & PRIVACY</h2>
            <div style={{ lineHeight: '1.7', color: 'var(--text)', fontSize: '0.95rem', display: 'flex', flexDirection: 'column', gap: '30px' }}>
              
              <div>
                <h3 style={{ fontSize: '0.85rem', fontWeight: 900, color: 'var(--primary)', marginBottom: '15px', textTransform: 'uppercase', letterSpacing: '0.1em', textAlign: 'center' }}>The Name Saphyr</h3>
                <p style={{ textAlign: 'left' }}>The name <strong>Saphyr</strong> reflects our core identity: Clarity, Resilience, and Preservation. Just as a sapphire is renowned for its structural hardness and deep transparency, our platform is built to be a vault for your data, offering a crystal-clear lens into your wealth.</p>
              </div>

              <div>
                <h3 style={{ fontSize: '0.85rem', fontWeight: 900, color: 'var(--primary)', marginBottom: '15px', textTransform: 'uppercase', letterSpacing: '0.1em', textAlign: 'center' }}>Purpose & Intent</h3>
                <p>Saphyr is a premium management environment designed for individuals who demand absolute data sovereignty. Most financial apps provide convenience at the cost of your identity—scraping credentials to sell your spending patterns to advertisers and insurers.</p>
                <p style={{ marginTop: '12px' }}><strong>We provide a different service:</strong> A private, manual logging system that fosters a deeper psychological connection with your wealth. By confronting every dollar manually, you achieve more intentional spending and higher financial discipline.</p>
              </div>

              <div style={{ background: 'rgba(16, 185, 129, 0.05)', padding: '25px', borderRadius: '16px', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                <h3 style={{ fontSize: '0.85rem', fontWeight: 900, color: 'var(--success)', marginBottom: '15px', textTransform: 'uppercase', letterSpacing: '0.1em', textAlign: 'center' }}>The Privacy Promise</h3>
                <ul style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '12px', margin: 0 }}>
                  <li><strong>Zero External Linkage:</strong> Saphyr will never ask for your bank login, SSN, or account numbers. We operate entirely off the grid.</li>
                  <li><strong>No Data Monetization:</strong> Your financial history is never sold, analyzed for marketing, or shared with third parties.</li>
                  <li><strong>Data Portability:</strong> You are the owner of your information. We provide the tools to export your entire history at any time.</li>
                </ul>
              </div>
            </div>
          </section>

          {/* SECTION 2: ACCOUNT PREFERENCES */}
          <section id="preferences">
            <h2 style={{ fontSize: '1.5rem', fontWeight: 900, marginBottom: '25px', borderBottom: '2px solid var(--primary)', paddingBottom: '10px', textAlign: 'center' }}>ACCOUNT PREFERENCES</h2>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
              <div>
                <h3 style={{ fontSize: '0.8rem', fontWeight: 800, marginBottom: '15px', color: 'var(--text-muted)', textTransform: 'uppercase', textAlign: 'center' }}>Accent Personalization</h3>
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '20px', justifyContent: 'center' }}>
                  {ACCENT_COLORS.map(c => (
                    <button 
                      key={c.color} 
                      onClick={() => { updateUserPreferences({ accent_color: c.color }); document.documentElement.style.setProperty('--primary', c.color); }} 
                      style={{ width: '32px', height: '32px', borderRadius: '50%', background: c.color, border: user?.accent_color === c.color ? '3px solid white' : 'none', padding: 0, marginTop: 0, flexShrink: 0, boxShadow: user?.accent_color === c.color ? `0 0 15px ${c.color}` : 'none', cursor: 'pointer' }}
                      title={c.name}
                    />
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', maxWidth: '500px', margin: '0 auto', width: '100%' }}>
                <div className="card glow-primary" style={{ padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 800 }}>CURRENCY DISPLAY</span>
                  <select value={user?.currency_symbol || '$'} onChange={(e) => updateUserPreferences({ currency_symbol: e.target.value })} style={{ width: 'auto', padding: '8px', fontSize: '0.8rem' }}>
                    <option value="$">USD ($)</option><option value="£">GBP (£)</option><option value="€">EUR (€)</option><option value="¥">JPY (¥)</option>
                  </select>
                </div>

                <div className="card glow-primary" style={{ padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 800, color: isPrivacyMode ? 'var(--text)' : 'var(--inactive-text)' }}>PRIVACY MODE</span>
                  <button onClick={togglePrivacyMode} style={{ width: 'auto', padding: '8px 16px', background: isPrivacyMode ? 'var(--primary)' : 'var(--inactive-bg)', color: isPrivacyMode ? 'white' : 'var(--inactive-text)', fontSize: '0.75rem', fontWeight: 800, marginTop: 0, border: '1px solid var(--border)' }}>
                    {isPrivacyMode ? '[ON]' : '[OFF]'}
                  </button>
                </div>

                <div className="card glow-primary" style={{ padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 800, color: isEditMode ? 'var(--text)' : 'var(--inactive-text)' }}>EDIT MODE</span>
                  <button onClick={toggleEditMode} style={{ width: 'auto', padding: '8px 16px', background: isEditMode ? 'var(--primary)' : 'var(--inactive-bg)', color: isEditMode ? 'white' : 'var(--inactive-text)', fontSize: '0.75rem', fontWeight: 800, marginTop: 0, border: '1px solid var(--border)' }}>
                    {isEditMode ? '[ON]' : '[OFF]'}
                  </button>
                </div>

                <div className="card glow-primary" style={{ padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 800, color: !hideGuides ? 'var(--text)' : 'var(--inactive-text)' }}>HELP GUIDES</span>
                  <button onClick={toggleGuides} style={{ width: 'auto', padding: '8px 16px', background: !hideGuides ? 'var(--primary)' : 'var(--inactive-bg)', color: !hideGuides ? 'white' : 'var(--inactive-text)', fontSize: '0.75rem', fontWeight: 800, marginTop: 0, border: '1px solid var(--border)' }}>
                    {!hideGuides ? '[ON]' : '[OFF]'}
                  </button>
                </div>

                <div className="card glow-primary" style={{ padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', opacity: user?.auto_logout_minutes === 0 ? 0.5 : 1, transition: 'opacity 0.3s ease' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 800 }}>AUTO-LOGOUT</span>
                  <select value={user?.auto_logout_minutes ?? 30} onChange={(e) => updateUserPreferences({ auto_logout_minutes: parseInt(e.target.value) })} style={{ width: 'auto', padding: '8px', fontSize: '0.8rem' }}>
                    <option value={2}>2 Minutes</option><option value={5}>5 Minutes</option><option value={10}>10 Minutes</option><option value={15}>15 Minutes</option><option value={30}>30 Minutes</option><option value={0}>OFF</option>
                  </select>
                </div>
              </div>
            </div>
          </section>

          {/* SECTION 3: ACCOUNT SECURITY */}
          <section id="security">
            <h2 style={{ fontSize: '1.5rem', fontWeight: 900, marginBottom: '25px', borderBottom: '2px solid var(--danger)', paddingBottom: '10px', textAlign: 'center' }}>ACCOUNT SECURITY</h2>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              
              {/* SAPHYR VAULT PIN */}
              <div className="card glow-primary" style={{ padding: '25px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 800, fontSize: '0.9rem' }}>SAPHYR VAULT PIN</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>Physical security layer for your data.</div>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <input 
                    type="password" 
                    placeholder="4-DIGIT PIN" 
                    maxLength={4} 
                    value={vaultPinInput}
                    onChange={e => setVaultPinInput(e.target.value.replace(/\D/g,''))}
                    style={{ width: '120px', textAlign: 'center', letterSpacing: '0.5em' }}
                  />
                  <button 
                    onClick={() => {
                      if (vaultPinInput.length === 4) {
                        setVaultPin(vaultPinInput);
                        setMessage({ text: 'VAULT PIN SECURED', type: 'success' });
                        setVaultPinInput('');
                      }
                    }} 
                    style={{ width: 'auto', background: 'var(--primary)', fontSize: '0.7rem' }}
                  >
                    {hasVaultPin ? 'UPDATE' : 'SET PIN'}
                  </button>
                </div>
              </div>

              {/* COLLAPSIBLE IDENTITY */}
              <div className="card glow-primary" style={{ padding: 0, overflow: 'hidden' }}>
                <button onClick={() => setIsIdentityExpanded(!isIdentityExpanded)} style={{ width: '100%', background: 'none', padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: 'none', border: 'none', color: 'var(--text)', marginTop: 0 }}>
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontWeight: 800, fontSize: '0.9rem' }}>ASSOCIATED IDENTITY</div>
                  </div>
                  <span style={{ fontSize: '1.2rem', fontWeight: 900 }}>{isIdentityExpanded ? '−' : '+'}</span>
                </button>
                {isIdentityExpanded && (
                  <div style={{ padding: '0 20px 25px 20px', borderTop: '1px solid var(--border)', paddingTop: '20px' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '20px', padding: '15px', background: 'rgba(255,255,255,0.02)', borderRadius: '10px', border: '1px solid var(--border)' }}>
                      <label style={{ fontSize: '0.55rem', fontWeight: 900, display: 'block', marginBottom: '4px', opacity: 0.6 }}>CURRENT IDENTITY</label>
                      {user?.full_name || 'No Username'} • {user?.email}
                    </div>
                    <form onSubmit={handleIdentityUpdate} style={{ maxWidth: '400px' }}>
                      <div className="form-group"><label>Email Address</label><input type="email" required value={identity.email} onChange={e => setIdentity({...identity, email: e.target.value})} /></div>
                      <div className="form-group"><label>Username</label><input type="text" required value={identity.full_name} onChange={e => setIdentity({...identity, full_name: e.target.value})} /></div>
                      <button type="submit" disabled={loading} style={{ width: '100%', background: 'var(--primary)' }}>{loading ? 'SYNCING...' : 'UPDATE IDENTITY'}</button>
                    </form>
                  </div>
                )}
              </div>

              {/* COLLAPSIBLE PASSWORD */}
              <div className="card glow-primary" style={{ padding: 0, overflow: 'hidden' }}>
                <button onClick={() => setIsPasswordExpanded(!isPasswordExpanded)} style={{ width: '100%', background: 'none', padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: 'none', border: 'none', color: 'var(--text)', marginTop: 0 }}>
                  <span style={{ fontWeight: 800, fontSize: '0.9rem' }}>UPDATE PASSWORD</span>
                  <span style={{ fontSize: '1.2rem', fontWeight: 900 }}>{isPasswordExpanded ? '−' : '+'}</span>
                </button>
                {isPasswordExpanded && (
                  <div style={{ padding: '0 20px 25px 20px', borderTop: '1px solid var(--border)', paddingTop: '20px' }}>
                    <form onSubmit={handlePasswordUpdate} style={{ maxWidth: '400px' }}>
                      <div className="form-group">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <label>Current Password</label>
                          <button 
                            type="button" 
                            onClick={() => setShowPassword(!showPassword)}
                            style={{ background: 'none', border: 'none', color: 'var(--primary)', fontSize: '0.65rem', fontWeight: 800, padding: 0, width: 'auto', boxShadow: 'none', cursor: 'pointer', marginTop: 0 }}
                          >
                            [{showPassword ? 'HIDE' : 'SHOW'}]
                          </button>
                        </div>
                        <input type={showPassword ? 'text' : 'password'} required value={passwords.current} onChange={e => setPasswords({...passwords, current: e.target.value})} />
                      </div>
                      <div className="form-group"><label>New Password</label><input type={showPassword ? 'text' : 'password'} required value={passwords.new} onChange={e => setPasswords({...passwords, new: e.target.value})} /></div>
                      <div className="form-group"><label>Confirm New</label><input type={showPassword ? 'text' : 'password'} required value={passwords.confirm} onChange={e => setPasswords({...passwords, confirm: e.target.value})} /></div>
                      <button type="submit" disabled={loading} style={{ width: '100%', background: 'var(--danger)' }}>{loading ? 'SYNCING...' : 'CONFIRM CHANGE'}</button>
                    </form>
                  </div>
                )}
              </div>

              {/* COLLAPSIBLE 2FA */}
              <div className="card glow-primary" style={{ padding: 0, overflow: 'hidden' }}>
                <button onClick={() => setIs2FAExpanded(!is2FAExpanded)} style={{ width: '100%', background: 'none', padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: 'none', border: 'none', color: 'var(--text)', marginTop: 0 }}>
                  <span style={{ fontWeight: 800, fontSize: '0.9rem' }}>TWO-FACTOR AUTHENTICATION</span>
                  <span style={{ fontSize: '1.2rem', fontWeight: 900 }}>{is2FAExpanded ? '−' : '+'}</span>
                </button>
                {is2FAExpanded && (
                  <div style={{ padding: '25px', borderTop: '1px solid var(--border)' }}>
                    {/* Email 2FA */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: '0.9rem' }}>EMAIL VERIFICATION</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>Receive a secure code via email during login.</div>
                      </div>
                      <button onClick={() => updateUserPreferences({ two_factor_method: user?.two_factor_method === 'email' ? 'none' : 'email' })} style={{ width: 'auto', padding: '10px 20px', background: user?.two_factor_method === 'email' ? 'var(--primary)' : 'var(--inactive-bg)', color: user?.two_factor_method === 'email' ? 'white' : 'var(--inactive-text)', fontSize: '0.75rem', fontWeight: 800, marginTop: 0, border: '1px solid var(--border)' }}>
                        {user?.two_factor_method === 'email' ? '[ENABLED]' : '[DISABLED]'}
                      </button>
                    </div>

                    {/* TOTP 2FA */}
                    <div style={{ borderTop: '1px solid var(--border)', paddingTop: '25px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div style={{ fontWeight: 800, fontSize: '0.9rem' }}>AUTHENTICATOR APP (TOTP)</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>Use an app like Google Authenticator or Authy.</div>
                        </div>
                        {user?.totp_enabled ? (
                          <button onClick={handleDisableTOTP} style={{ width: 'auto', padding: '10px 20px', background: 'var(--danger)', color: 'white', fontSize: '0.75rem', fontWeight: 800, marginTop: 0, border: 'none' }}>
                            [DISABLE]
                          </button>
                        ) : (
                          <button onClick={handleSetupTOTP} disabled={!!totpSetup} style={{ width: 'auto', padding: '10px 20px', background: 'var(--primary)', color: 'white', fontSize: '0.75rem', fontWeight: 800, marginTop: 0, border: 'none' }}>
                            {totpSetup ? 'SETUP IN PROGRESS' : '[CONFIGURE]'}
                          </button>
                        )}
                      </div>

                      {totpSetup && (
                        <div style={{ marginTop: '25px', padding: '20px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px dashed var(--primary)', textAlign: 'center' }}>
                          <p style={{ fontSize: '0.85rem', marginBottom: '15px' }}>1. Scan this QR code with your Authenticator app:</p>
                          <img src={totpSetup.qrCode} alt="TOTP QR Code" style={{ background: 'white', padding: '10px', borderRadius: '10px', marginBottom: '15px' }} />
                          <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '15px' }}>Or enter manually: <code style={{ color: 'var(--primary)' }}>{totpSetup.secret}</code></p>
                          <div className="form-group" style={{ maxWidth: '200px', margin: '0 auto 15px auto' }}>
                            <label>2. Enter Code to Verify</label>
                            <input type="text" value={totpCode} onChange={e => setTotpCode(e.target.value)} placeholder="000000" style={{ textAlign: 'center', fontSize: '1.2rem', letterSpacing: '0.2em' }} maxLength={6} />
                          </div>
                          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                            <button onClick={handleVerifyTOTP} style={{ background: 'var(--success)', fontSize: '0.75rem', padding: '10px 20px', width: 'auto', marginTop: 0 }}>ACTIVATE TOTP</button>
                            <button onClick={() => setTotpSetup(null)} style={{ background: 'none', border: '1px solid var(--border)', fontSize: '0.75rem', padding: '10px 20px', width: 'auto', marginTop: 0, boxShadow: 'none' }}>CANCEL</button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* COLLAPSIBLE DELETE ACCOUNT */}
              <div className="card glow-danger" style={{ padding: 0, overflow: 'hidden' }}>
                <button onClick={() => setIsDangerExpanded(!isDangerExpanded)} style={{ width: '100%', background: 'none', padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: 'none', border: 'none', color: 'var(--danger)', marginTop: 0 }}>
                  <span style={{ fontWeight: 800, fontSize: '0.9rem' }}>DELETE ACCOUNT</span>
                  <span style={{ fontSize: '1.2rem', fontWeight: 900 }}>{isDangerExpanded ? '−' : '+'}</span>
                </button>
                {isDangerExpanded && (
                  <div style={{ padding: '25px', borderTop: '1px solid rgba(244, 63, 94, 0.2)' }}>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '20px' }}>These actions are irreversible. Please proceed with extreme caution.</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                      <button onClick={handleResetAccount} style={{ background: 'none', border: '1px solid var(--danger)', color: 'var(--danger)', fontSize: '0.75rem', fontWeight: 800, padding: '15px', boxShadow: 'none', marginTop: 0 }}>RESET ALL DATA (PURGE HISTORY, KEEP LOGIN)</button>
                      <button onClick={handleDeleteAccount} style={{ background: 'var(--danger)', color: 'white', fontSize: '0.75rem', fontWeight: 800, padding: '15px', boxShadow: 'none', marginTop: 0 }}>PERMANENTLY DELETE ACCOUNT & IDENTITY</button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>

          <section id="data">
            <h2 style={{ fontSize: '1.5rem', fontWeight: 900, marginBottom: '25px', borderBottom: '2px solid var(--success)', paddingBottom: '10px', textAlign: 'center' }}>DATA MANAGEMENT</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
              <div className="card glow-success highlight-hover" onClick={handleExportCSV} style={{ cursor: 'pointer', textAlign: 'center', background: 'rgba(255,255,255,0.01)', height: '120px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
                <div style={{ fontWeight: 900, fontSize: '1.1rem', marginBottom: '5px' }}>CSV EXPORT</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Raw Transaction Logs</div>
              </div>
              <div className="card glow-success highlight-hover" onClick={handleExportPDF} style={{ cursor: 'pointer', textAlign: 'center', background: 'rgba(255,255,255,0.01)', height: '120px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
                <div style={{ fontWeight: 900, fontSize: '1.1rem', marginBottom: '5px' }}>OFFICIAL STATEMENT</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Professional PDF Summary</div>
              </div>
            </div>
          </section>
        </div>
      </div>
      
      <style>{`
        .sidebar-link:hover { background: rgba(59, 130, 246, 0.08) !important; color: var(--primary) !important; transform: translateX(4px); }
        .sidebar-link { transition: all 0.2s ease; }
        .highlight-hover:hover { border-color: var(--primary) !important; background: rgba(255,255,255,0.04) !important; transform: translateY(-2px); }
        
        .settings-nav-container {
          width: 220px;
          position: sticky;
          top: 100px;
          height: fit-content;
          border-right: 1px solid var(--border);
          padding-right: 20px;
        }

        @media (max-width: 768px) {
          .settings-container { flex-direction: column !important; padding: 15px !important; }
          .settings-nav-container { 
            width: 100%; 
            position: static; 
            border-right: none; 
            padding-right: 0; 
            margin-bottom: 40px; 
            border-bottom: 1px solid var(--border);
            padding-bottom: 20px;
          }
          .settings-content { padding-left: 0 !important; }
          .sidebar-link { margin-bottom: 5px; background: rgba(255,255,255,0.02) !important; border: 2px solid var(--border) !important; }
          .sidebar-user-label { text-align: center; }
          .settings-nav-container > div { text-align: center; }
        }
      `}</style>
    </div>
  );
};

export default SettingsPage;
