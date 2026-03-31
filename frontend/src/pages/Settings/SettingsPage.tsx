import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { updatePassword, deleteAccountApi, fetchTransactions, fetchAccounts } from '../../services/api';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

const SettingsPage: React.FC = () => {
  const { user, logout, isPrivacyMode, togglePrivacyMode, isEditMode, toggleEditMode, updateUserPreferences } = useAuth();
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

    if (passwords.new.length < 8) {
      return setMessage({ text: 'Password must be at least 8 characters', type: 'error' });
    }

    if (!/[A-Z]/.test(passwords.new) || !/[0-9]/.test(passwords.new)) {
      return setMessage({ text: 'Password must contain an uppercase letter and a number', type: 'error' });
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
    setMessage({ text: 'Preferences updated!', type: 'success' });
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

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      const offset = 100;
      const bodyRect = document.body.getBoundingClientRect().top;
      const elementRect = element.getBoundingClientRect().top;
      const elementPosition = elementRect - bodyRect;
      const offsetPosition = elementPosition - offset;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'First session';
    const date = new Date(dateString);
    return date.toLocaleString(undefined, { 
      month: 'short', 
      day: 'numeric', 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const handleExportCSV = async () => {
    try {
      const [accounts, transactions] = await Promise.all([
        fetchAccounts(),
        fetchTransactions()
      ]);

      const headers = ['Date', 'Category', 'Description', 'Amount', 'Type', 'Account'];
      const rows = (transactions || []).map((tx: any) => [
        tx.date ? tx.date.split('T')[0] : '',
        `"${tx.category}"`,
        `"${tx.description || ''}"`,
        tx.amount,
        tx.type,
        `"${accounts.find((a: any) => a.id === tx.account_id)?.name || 'Unknown'}"`
      ]);

      const csvContent = [headers.join(','), ...rows.map((row: any[]) => row.join(','))].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.setAttribute('href', URL.createObjectURL(blob));
      link.setAttribute('download', `saphyr_export_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setMessage({ text: 'Data exported!', type: 'success' });
    } catch (err) {
      setMessage({ text: 'Export failed', type: 'error' });
    }
  };

  const handleExportPDF = async () => {
    try {
      const [accounts, transactions] = await Promise.all([fetchAccounts(), fetchTransactions()]);
      const doc = new jsPDF();
      doc.setFontSize(22);
      doc.setTextColor(59, 130, 246);
      doc.text('SAPHYR FINANCIAL STATEMENT', 105, 20, { align: 'center' });
      doc.setFontSize(10);
      doc.setTextColor(100, 116, 139);
      doc.text(`Generated on: ${new Date().toLocaleString()}`, 105, 30, { align: 'center' });
      doc.setFontSize(16);
      doc.setTextColor(0, 0, 0);
      doc.text('Account Balances', 14, 45);
      const accountData = (accounts || []).map((a: any) => [a.name, a.type, `${user?.currency_symbol || '$'}${parseFloat(a.balance).toLocaleString()}`]);
      autoTable(doc, { startY: 50, head: [['Account Name', 'Type', 'Balance']], body: accountData, theme: 'striped', headStyles: { fillColor: [59, 130, 246] } });
      const lastY = (doc as any).lastAutoTable.finalY || 50;
      doc.text('Transaction History', 14, lastY + 20);
      const txData = (transactions || []).slice(0, 50).map((tx: any) => [tx.date ? tx.date.split('T')[0] : '', tx.category, tx.description || '', `${tx.type === 'expense' ? '-' : '+'}${user?.currency_symbol || '$'}${parseFloat(tx.amount).toLocaleString()}`]);
      autoTable(doc, { startY: lastY + 25, head: [['Date', 'Category', 'Description', 'Amount']], body: txData, theme: 'grid', headStyles: { fillColor: [59, 130, 246] } });
      doc.save(`saphyr_statement_${new Date().toISOString().split('T')[0]}.pdf`);
      setMessage({ text: 'Statement generated!', type: 'success' });
    } catch (err) {
      setMessage({ text: 'PDF failed', type: 'error' });
    }
  };

  const menuItems = [
    { id: 'about', label: 'About' },
    { id: 'privacy', label: 'Privacy' },
    { id: 'navigation', label: 'Tabs' },
    { id: 'personalization', label: 'Style' },
    { id: 'preferences', label: 'General' },
    { id: 'data', label: 'Data' },
    { id: 'security', label: 'Security' },
    { id: 'delete', label: 'Delete' },
  ];

  return (
    <div className="settings-page">
      <div className="settings-container" style={{ display: 'flex', maxWidth: '1000px', margin: '0 auto', gap: '0', paddingTop: '20px', textAlign: 'left' }}>
        
        {/* SIDEBAR FOR DESKTOP */}
        <div className="settings-sidebar" style={{ width: '220px', position: 'sticky', top: '100px', height: 'fit-content', display: 'flex', flexDirection: 'column', gap: '2px', paddingRight: '20px', borderRight: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '0 10px 15px 10px', marginBottom: '10px', borderBottom: '1px solid var(--border)' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem', fontWeight: 900, flexShrink: 0 }}>
              {(user?.full_name || 'U').charAt(0).toUpperCase()}
            </div>
            <div style={{ overflow: 'hidden' }}>
              <div style={{ fontWeight: 800, fontSize: '0.8rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.full_name || 'User'}</div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.email}</div>
            </div>
          </div>
          <h2 style={{ fontSize: '0.8rem', marginBottom: '10px', paddingLeft: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)' }}>Settings</h2>
          {menuItems.map(item => (
            <button key={item.id} onClick={() => scrollToSection(item.id)} className="sidebar-link" style={{ background: 'none', border: 'none', textAlign: 'left', padding: '10px 15px', borderRadius: '8px', color: 'var(--text)', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', boxShadow: 'none', marginTop: 0, transition: 'all 0.2s ease' }}>
              {item.label}
            </button>
          ))}
        </div>

        {/* MOBILE HORIZONTAL NAVIGATION */}
        <div className="settings-mobile-nav">
          {menuItems.map(item => (
            <button key={item.id} onClick={() => scrollToSection(item.id)} className="mobile-nav-chip">
              {item.label}
            </button>
          ))}
        </div>

        <div className="settings-content" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '60px', paddingBottom: '100px', paddingLeft: '35px' }}>
          {message.text && (
            <div style={{ background: message.type === 'error' ? 'rgba(244, 63, 94, 0.1)' : 'rgba(34, 197, 94, 0.1)', color: message.type === 'error' ? 'var(--danger)' : 'var(--success)', padding: '12px', textAlign: 'center', fontWeight: 700, borderRadius: '12px', border: `1px solid ${message.type === 'error' ? 'var(--danger)' : 'var(--success)'}`, marginBottom: '-15px', fontSize: '0.9rem' }}>
              {message.text}
            </div>
          )}

          <section id="about">
            <h3 style={{ color: 'var(--text)', fontSize: '1.2rem', marginBottom: '15px', paddingBottom: '8px', fontWeight: 800, textAlign: 'center' }}>About Saphyr</h3>
            <div style={{ lineHeight: '1.7', color: 'var(--text)', fontSize: '0.95rem' }}>
              <p style={{ marginBottom: '12px' }}>Saphyr is a premium, private financial tracking environment designed for those who value absolute data sovereignty and tactile financial management.</p>
              <p>Unlike traditional apps that scrap your bank data for advertisements, Saphyr operates on a zero-linkage principle. By manually logging your accounts and transactions, you build a deeper psychological connection with your spending habits while keeping your real credentials off the grid.</p>
            </div>
          </section>

          <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: 0, opacity: 0.5 }} />

          <section id="privacy">
            <h3 style={{ color: 'var(--success)', fontSize: '1.2rem', marginBottom: '15px', paddingBottom: '8px', fontWeight: 800, textAlign: 'center' }}>The Saphyr Privacy Pledge</h3>
            <div style={{ lineHeight: '1.7', color: 'var(--text)', fontSize: '0.95rem' }}>
              <p style={{ marginBottom: '12px' }}>Your financial life is your own. Saphyr is built on three unbreakable pillars:</p>
              <ul style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <li>Zero External Links: We will never ask for your bank login, SSN, or account numbers. We don't use Plaid or Yodlee.</li>
                <li>No Data Monetization: Your data is never sold, analyzed for marketing, or shared with third-party insurers.</li>
                <li>Local-First Philosophy: Your balances and transaction history are yours to manage. We provide the tools; you provide the data.</li>
              </ul>
            </div>
          </section>

          <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: 0, opacity: 0.5 }} />

          <section id="navigation">
            <h3 style={{ color: 'var(--primary)', fontSize: '1.2rem', marginBottom: '15px', paddingBottom: '8px', fontWeight: 800, textAlign: 'center' }}>Navigation</h3>
            <p style={{ marginBottom: '20px', fontSize: '0.85rem', color: 'var(--text-muted)', textAlign: 'center' }}>Choose which tabs are visible in your main menu.</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '10px' }}>
              {[
                { path: '/', label: 'Dashboard' },
                { path: '/income', label: 'Income' },
                { path: '/accounts', label: 'Accounts' },
                { path: '/bills', label: 'Bills' },
                { path: '/transactions', label: 'Transactions' },
                { path: '/trends', label: 'Trends' },
                { path: '/settings', label: 'Settings' },
              ].map(tab => {
              const currentTabs = Array.isArray(user?.visible_tabs) && user.visible_tabs.length > 0 
                ? user.visible_tabs 
                : ['/', '/income', '/accounts', '/bills', '/transactions', '/trends', '/settings'];
              
              const isVisible = currentTabs.includes(tab.path);
              
              return (
                <button 
                  key={tab.path} 
                  type="button"
                  onClick={async () => {
                    const newTabs = isVisible 
                      ? currentTabs.filter((t: string) => t !== tab.path) 
                      : [...currentTabs, tab.path];
                    
                    if (newTabs.length > 0) {
                      await updateUserPreferences({ visible_tabs: newTabs });
                      setMessage({ text: `Navigation updated: ${tab.label} is now ${isVisible ? 'OFF' : 'ON'}`, type: 'success' });
                    }
                  }} 
                  style={{ 
                    padding: '12px', 
                    fontSize: '0.75rem', 
                    fontWeight: 800,
                    background: isVisible ? 'var(--primary)' : 'rgba(255,255,255,0.05)', 
                    color: isVisible ? 'white' : 'var(--text-muted)', 
                    border: isVisible ? '1px solid var(--primary)' : '1px solid var(--border)', 
                    boxShadow: isVisible ? '0 0 15px var(--primary)' : 'none', 
                    marginTop: 0,
                    cursor: 'pointer',
                    borderRadius: '8px',
                    letterSpacing: '0.05em'
                  }}
                >
                  {tab.label} [{isVisible ? 'ON' : 'OFF'}]
                </button>
              );
            })}
            </div>
          </section>

          <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: 0, opacity: 0.5 }} />

          <section id="personalization">
            <h3 style={{ color: 'var(--text)', fontSize: '1.2rem', marginBottom: '15px', paddingBottom: '8px', fontWeight: 800, textAlign: 'center' }}>Personalization</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>Accent Color</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Customize the primary theme color.</div>
                </div>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                  {['#3b82f6', '#10b981', '#8b5cf6', '#f43f5e', '#f59e0b'].map(color => (
                    <button 
                      key={color} 
                      onClick={() => { updateUserPreferences({ accent_color: color }); document.documentElement.style.setProperty('--primary', color); }} 
                      style={{ 
                        width: '28px', 
                        height: '28px', 
                        borderRadius: '50%', 
                        background: color, 
                        border: user?.accent_color === color ? '2px solid white' : 'none', 
                        padding: 0, 
                        marginTop: 0, 
                        flexShrink: 0,
                        boxShadow: user?.accent_color === color ? `0 0 10px ${color}` : 'none',
                        cursor: 'pointer'
                      }} 
                    />
                  ))}
                </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>Currency Symbol</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Choose your local currency display.</div>
                </div>
                <select value={user?.currency_symbol || '$'} onChange={(e) => updateUserPreferences({ currency_symbol: e.target.value })} style={{ width: 'auto', padding: '8px 12px', fontSize: '0.85rem', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', color: 'var(--text)' }}>
                  <option value="$">USD ($)</option>
                  <option value="£">GBP (£)</option>
                  <option value="€">EUR (€)</option>
                  <option value="¥">JPY (¥)</option>
                </select>
                </div>            </div>
          </section>

          <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: 0, opacity: 0.5 }} />

          <section id="preferences">
            <h3 style={{ color: 'var(--text)', fontSize: '1.2rem', marginBottom: '15px', paddingBottom: '8px', fontWeight: 800, textAlign: 'center' }}>Preferences</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>Stealth Mode</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Automatically blur app when tab loses focus.</div>
                </div>
                <button onClick={() => updateUserPreferences({ stealth_mode: !user?.stealth_mode })} style={{ width: 'auto', background: user?.stealth_mode ? 'var(--primary)' : 'rgba(255,255,255,0.05)', color: user?.stealth_mode ? 'white' : 'var(--text)', padding: '6px 15px', fontSize: '0.8rem', marginTop: 0 }}>
                  {user?.stealth_mode ? 'Enabled' : 'Disabled'}
                </button>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>Privacy Mode</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Mask financial balances with stars.</div>
                </div>
                <button onClick={togglePrivacyMode} style={{ width: 'auto', background: isPrivacyMode ? 'var(--primary)' : 'rgba(255,255,255,0.05)', color: isPrivacyMode ? 'white' : 'var(--text)', padding: '6px 15px', fontSize: '0.8rem', marginTop: 0 }}>
                  {isPrivacyMode ? 'Enabled' : 'Disabled'}
                </button>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>Edit Mode</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Rearrange page boxes and sections.</div>
                </div>
                <button onClick={toggleEditMode} style={{ width: 'auto', background: isEditMode ? 'var(--primary)' : 'rgba(255,255,255,0.05)', color: isEditMode ? 'white' : 'var(--text)', padding: '6px 15px', fontSize: '0.8rem', marginTop: 0 }}>
                  {isEditMode ? 'Enabled' : 'Disabled'}
                </button>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>Auto-Logout Inactivity</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Automatically sign out after period of inactivity.</div>
                </div>
                <select value={user?.auto_logout_minutes || 30} onChange={(e) => updateUserPreferences({ auto_logout_minutes: parseInt(e.target.value) })} style={{ width: 'auto', padding: '6px 10px', fontSize: '0.8rem', borderRadius: '8px' }}>
                  <option value={15}>15 Minutes</option>
                  <option value={30}>30 Minutes</option>
                  <option value={60}>1 Hour</option>
                  <option value={0}>Never</option>
                </select>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>Two-Factor Method</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Additional security for your login.</div>
                </div>
                <select value={user?.two_factor_method || 'none'} onChange={(e) => updateUserPreferences({ two_factor_method: e.target.value })} style={{ width: 'auto', padding: '6px 10px', fontSize: '0.8rem', borderRadius: '8px' }}>
                  <option value="none">Disabled</option>
                  <option value="email">Email Verification</option>
                </select>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>Instructional Guides</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Enable or disable help boxes across the app.</div>
                </div>
                <button onClick={toggleGuides} style={{ width: 'auto', background: !hideGuides ? 'var(--primary)' : 'rgba(255,255,255,0.05)', color: !hideGuides ? 'white' : 'var(--text)', padding: '6px 15px', fontSize: '0.8rem', marginTop: 0 }}>
                  {!hideGuides ? 'Shown' : 'Hidden'}
                </button>
              </div>
            </div>
          </section>

          <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: 0, opacity: 0.5 }} />

          <section id="data">
            <h3 style={{ color: 'var(--text)', fontSize: '1.2rem', marginBottom: '15px', paddingBottom: '8px', fontWeight: 800, textAlign: 'center' }}>Data & Portability</h3>
            <p style={{ marginBottom: '20px', fontSize: '0.85rem', color: 'var(--text-muted)', textAlign: 'center' }}>Take your financial logs with you. We believe in total data sovereignty.</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
              <button onClick={handleExportCSV} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', fontSize: '0.85rem', padding: '15px', marginTop: 0 }}>Download CSV .csv</button>
              <button onClick={handleExportPDF} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', fontSize: '0.85rem', padding: '15px', marginTop: 0 }}>Financial Statement .pdf</button>
            </div>
          </section>

          <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: 0, opacity: 0.5 }} />

          <section id="security">
            <h3 style={{ color: 'var(--text)', fontSize: '1.2rem', marginBottom: '10px', paddingBottom: '8px', fontWeight: 800, textAlign: 'center' }}>Security</h3>
            <p style={{ marginBottom: '20px', fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: '1.5', textAlign: 'center' }}>Update your account password here. We recommend using a unique, strong password. Minimum 8 characters.</p>
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <form onSubmit={handlePasswordUpdate} style={{ maxWidth: '350px', width: '100%', textAlign: 'left' }}>
                <div className="form-group" style={{ marginBottom: '12px' }}>
                  <label style={{ fontSize: '0.75rem' }}>Current Password</label>
                  <input type="password" required value={passwords.current} onChange={e => setPasswords({...passwords, current: e.target.value})} style={{ padding: '10px' }} />
                </div>
                <div className="form-group" style={{ marginBottom: '12px' }}>
                  <label style={{ fontSize: '0.75rem' }}>New Password</label>
                  <input type="password" required value={passwords.new} onChange={e => setPasswords({...passwords, new: e.target.value})} style={{ padding: '10px' }} />
                </div>
                <div className="form-group" style={{ marginBottom: '12px' }}>
                  <label style={{ fontSize: '0.75rem' }}>Confirm New Password</label>
                  <input type="password" required value={passwords.confirm} onChange={e => setPasswords({...passwords, confirm: e.target.value})} style={{ padding: '10px' }} />
                </div>
                <button type="submit" disabled={loading} style={{ marginTop: '5px', padding: '12px' }}>{loading ? 'Updating...' : 'Update Password'}</button>
              </form>
            </div>
          </section>

          <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: 0, opacity: 0.5 }} />

          <section id="delete">
            <h3 style={{ color: 'var(--danger)', fontSize: '1.2rem', marginBottom: '15px', paddingBottom: '8px', fontWeight: 800, textAlign: 'center' }}>Delete Account</h3>
            <p style={{ marginBottom: '15px', fontSize: '0.85rem', color: 'var(--text-muted)', textAlign: 'center' }}>Permanently delete your account and all financial history. Irreversible.</p>
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <button onClick={handleDeleteAccount} style={{ background: 'rgba(244, 63, 94, 0.05)', color: 'var(--danger)', border: '1px solid var(--danger)', boxShadow: 'none', width: 'auto', padding: '10px 20px', fontSize: '0.85rem' }}>Permanently Delete My Account</button>
            </div>
          </section>
        </div>
      </div>
      
      <style>{`
        .sidebar-link:hover { background: rgba(59, 130, 246, 0.08) !important; transform: translateX(4px); color: var(--primary) !important; }
        
        .settings-mobile-nav {
          display: none;
          position: sticky;
          top: 70px;
          z-index: 100;
          background: var(--card);
          padding: 15px 10px;
          margin: -20px -10px 20px -10px;
          border-bottom: 1px solid var(--border);
          overflow-x: auto;
          white-space: nowrap;
          gap: 8px;
          -webkit-overflow-scrolling: touch;
          scrollbar-width: none;
        }
        
        .settings-mobile-nav::-webkit-scrollbar { display: none; }
        
        .mobile-nav-chip {
          display: inline-block;
          padding: 8px 16px;
          background: rgba(255,255,255,0.05);
          border: 1px solid var(--border);
          border-radius: 20px;
          color: var(--text);
          font-size: 0.75rem;
          font-weight: 700;
          cursor: pointer;
          width: auto;
          marginTop: 0;
          box-shadow: none;
        }

        @media (max-width: 768px) {
          .settings-container { flex-direction: column !important; padding: 10px !important; }
          .settings-sidebar { display: none !important; }
          .settings-mobile-nav { display: flex !important; }
          .settings-content { padding-left: 0 !important; }
        }
      `}</style>
    </div>
  );
};

export default SettingsPage;
