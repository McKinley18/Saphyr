import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import './App.css';
import { 
  fetchAccounts, 
  fetchTransactions, 
  fetchSalaryProfile, 
  updateSalaryProfile, 
  fetchTaxEstimate, 
  fetchBudgets, 
  fetchIncomeSources,
  fetchSnapshots,
  createSnapshot,
  fetchGoals
} from './services/api';
import Navbar from './components/Navbar/Navbar';
import QuickLog from './components/QuickLog/QuickLog';
import CommandDeck from './components/CommandDeck/CommandDeck';
import Dashboard from './pages/Dashboard/Dashboard';
import AccountsPage from './pages/Accounts/AccountsPage';
import BillsPage from './pages/Bills/BillsPage';
import TransactionsPage from './pages/Transactions/TransactionsPage';
import IncomePage from './pages/Income/IncomePage';
import TrendsPage from './pages/Trends/TrendsPage';
import SettingsPage from './pages/Settings/SettingsPage';
import LoginPage from './pages/Auth/LoginPage';
import SignupPage from './pages/Auth/SignupPage';
import ForgotPasswordPage from './pages/Auth/ForgotPasswordPage';
import ResetPasswordPage from './pages/Auth/ResetPasswordPage';
import ProtectedRoute from './components/ProtectedRoute';
import PageWrapper from './components/PageWrapper/PageWrapper';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ModalProvider } from './context/ModalContext';

function AppContent() {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [budgets, setBudgets] = useState<any[]>([]);
  const [incomeSources, setIncomeSources] = useState<any[]>([]);
  const [snapshots, setSnapshots] = useState<any[]>([]);
  const [goals, setGoals] = useState<any[]>([]);
  const [salary, setSalary] = useState({ annual_salary: 0, '401k_percent': 0, filing_status: 'single' });
  const [taxEstimate, setTaxEstimate] = useState<any>(null);
  const [_loading, setLoading] = useState(true);
  const [isSplashActive, setIsSplashActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');
  const [lastFetched, setLastFetched] = useState(0);
  const [_retryCount, setRetryCount] = useState(0);
  const [isBlurred, setIsBlurred] = useState(false);

  const { user, loading: authLoading, logout, isPrivacyMode, isLocked, unlockVault } = useAuth();
  const location = useLocation();
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState(false);

  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (unlockVault(pinInput)) {
      setPinInput('');
      setPinError(false);
    } else {
      setPinError(true);
      setPinInput('');
      setTimeout(() => setPinError(false), 500);
    }
  };
  
  // Privacy Shield: Blur on Idle
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        setIsBlurred(true);
      } else {
        setIsBlurred(false);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Show splash on initial load
  useEffect(() => {
    if (authLoading) setIsSplashActive(true);
  }, [authLoading]);

  // Safety Timeout: Ensure splash always disappears
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsSplashActive(false);
    }, 5000); // 5 second hard limit
    return () => clearTimeout(timer);
  }, []);

  // Apply Accent Color
  useEffect(() => {
    if (user?.accent_color) {
      document.documentElement.style.setProperty('--primary', user.accent_color);
    }
  }, [user?.accent_color]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const loadData = async (force = false) => {
    if (!user) {
      setLoading(false);
      setTimeout(() => setIsSplashActive(false), 800);
      return;
    }

    const now = Date.now();
    if (!force && now - lastFetched < 5000) {
      setLoading(false);
      setIsSplashActive(false);
      return;
    }
    
    try {
      const responses = await Promise.all([
        fetchAccounts(),
        fetchTransactions(),
        fetchSalaryProfile(),
        fetchTaxEstimate(),
        fetchBudgets(),
        fetchIncomeSources(),
        fetchSnapshots(),
        fetchGoals()
      ]);

      const unauthorized = responses.some(res => 
        res && (res.error === 'Authentication required' || res.status === 401 || (typeof res.error === 'string' && res.error.includes('JWT')))
      );
      
      if (unauthorized) {
        if (localStorage.getItem('saphyr_user')) {
          logout();
        }
        return;
      }
      
      const [accs, txs, sal, tax, bdgs, incSrcs, snps, gls] = responses;
      
      setAccounts(accs || []);
      setTransactions(txs || []);
      setSalary(sal || { annual_salary: 0, '401k_percent': 0, filing_status: 'single' });
      setTaxEstimate(tax);
      setBudgets(bdgs || []);
      setIncomeSources(incSrcs || []);
      setSnapshots(snps || []);
      setGoals(gls || []);

      // INTELLIGENT MONTHLY RESET
      const currentMonthYear = `${new Date().getMonth()}-${new Date().getFullYear()}`;
      const lastReset = localStorage.getItem('saphyr_last_bill_reset');
      
      if (lastReset !== currentMonthYear) {
        const bills = (accs || []).filter((a: any) => a.is_bill && a.is_paid);
        if (bills.length > 0) {
          const { updateAccount } = await import('./services/api');
          await Promise.all(bills.map((b: any) => updateAccount(b.id, { is_paid: false })));
          const freshAccs = await fetchAccounts();
          setAccounts(freshAccs || []);
        }
        localStorage.setItem('saphyr_last_bill_reset', currentMonthYear);
      }

      setLastFetched(now);
      setRetryCount(0); 
      setError(null);

      // Daily Snapshot Capture
      if (accs && accs.length > 0) {
        const totalCash = accs
          .filter((a: any) => !a.is_bill)
          .reduce((sum: number, a: any) => sum + parseFloat(a.balance), 0);
        const totalDebt = accs
          .filter((a: any) => a.is_bill)
          .reduce((sum: number, a: any) => sum + Math.abs(parseFloat(a.balance)), 0);
        
        await createSnapshot({
          net_worth: totalCash - totalDebt,
          total_cash: totalCash,
          total_debt: totalDebt
        });
      }
    } catch (e: any) {
      console.error("Data Load Error:", e);
      setRetryCount(prev => {
        if (prev >= 2) {
          logout();
          return 0;
        }
        return prev + 1;
      });
      setError("Sync failed. Using cached data.");
      setIsSplashActive(false); 
    } finally {
      setLoading(false);
      setTimeout(() => setIsSplashActive(false), 800);
    }
  };

  useEffect(() => {
    if (!authLoading) {
      if (user) {
        loadData();
      } else {
        setLoading(false);
        setTimeout(() => setIsSplashActive(false), 1500);
      }
    }
  }, [user, authLoading]);

  const handleSalarySubmit = async (e: any, _filingStatus?: string, extraData?: any) => {
    if (e && e.preventDefault) e.preventDefault();
    try {
      const result = await updateSalaryProfile(extraData);
      if (result.taxEstimate) {
        setTaxEstimate(() => ({ ...result.taxEstimate }));
        if (result.salaryProfile) {
          setSalary(() => ({ ...result.salaryProfile }));
        }
      }
      return result;
    } catch (err: any) {
      setError("Failed to update salary: " + err.message);
    }
  };

  return (
    <>
      <AnimatePresence>
        {isLocked && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="vault-lock-overlay"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="vault-lock-card card"
            >
              <div className="lock-icon" style={{ fontSize: '3.5rem', marginBottom: '20px' }}>🔒</div>
              <h2 style={{ fontWeight: 900, marginBottom: '10px', letterSpacing: '0.1em' }}>VAULT LOCKED</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '30px' }}>Enter your 4-digit Saphyr PIN to proceed.</p>
              
              <form onSubmit={handleUnlock}>
                <div style={{ display: 'flex', gap: '15px', justifyContent: 'center', marginBottom: '30px' }}>
                  <input 
                    autoFocus
                    type="password"
                    maxLength={4}
                    value={pinInput}
                    onChange={e => setPinInput(e.target.value.replace(/\D/g,''))}
                    className={pinError ? 'pin-error' : ''}
                    style={{ width: '160px', textAlign: 'center', fontSize: '2.5rem', letterSpacing: '0.4em', background: 'rgba(255,255,255,0.05)', fontWeight: 900 }}
                  />
                </div>
                <button type="submit" className="primary-btn" style={{ height: '60px', fontSize: '1rem' }}>UNLOCK VAULT</button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className={`splash-overlay ${!isSplashActive ? 'hidden' : ''}`}>
        <div className="splash-logo-wrapper">
          <div className="forge-logo"></div>
        </div>
      </div>

      <div 
        data-privacy={isPrivacyMode}
        style={{ 
        opacity: isSplashActive ? 0 : 1,
        transition: 'opacity 1s ease, filter 0.3s ease',
        minHeight: '100vh',
        filter: isBlurred ? 'blur(10px) grayscale(50%)' : 'none',
        pointerEvents: isBlurred ? 'none' : 'auto'
      }}>
        {isBlurred && (
          <div style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, color: 'var(--text)', fontSize: '2rem', fontWeight: 900, textShadow: '0 4px 20px rgba(0,0,0,0.5)' }}>
            <div style={{ background: 'var(--card)', padding: '20px 40px', borderRadius: '20px', border: '2px solid var(--primary)', boxShadow: '0 20px 50px rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', gap: '15px' }}>
              <span>🔒</span> PRIVACY SHIELD ACTIVE
            </div>
          </div>
        )}
        <Navbar theme={theme} setTheme={setTheme} />
        <CommandDeck />
        <div className="container">
          {error && (
            <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', padding: '15px', borderRadius: '12px', marginBottom: '20px', border: '1px solid var(--danger)', textAlign: 'center', fontSize: '0.9rem', fontWeight: 700 }}>
              {error}
              <button onClick={() => setError(null)} style={{ marginLeft: '15px', background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', padding: 0, width: 'auto', boxShadow: 'none' }}>DISMISS</button>
            </div>
          )}
          <AnimatePresence mode="wait">
            <Routes location={location} key={location.pathname}>
              <Route path="/login" element={user ? <Navigate to="/" /> : <PageWrapper><LoginPage /></PageWrapper>} />
              <Route path="/signup" element={user ? <Navigate to="/" /> : <PageWrapper><SignupPage /></PageWrapper>} />
              <Route path="/forgot-password" element={<PageWrapper><ForgotPasswordPage /></PageWrapper>} />
              <Route path="/reset-password" element={<PageWrapper><ResetPasswordPage /></PageWrapper>} />
              
              <Route path="/" element={<ProtectedRoute><PageWrapper><Dashboard taxEstimate={taxEstimate} accounts={accounts} transactions={transactions} incomeSources={incomeSources} snapshots={snapshots} loadData={loadData}/></PageWrapper></ProtectedRoute>} />
              <Route path="/income" element={<ProtectedRoute><PageWrapper><IncomePage userId={user?.id} savedSalary={salary} taxEstimate={taxEstimate} incomeSources={incomeSources} accounts={accounts} handleSalarySubmit={handleSalarySubmit} loadData={loadData}/></PageWrapper></ProtectedRoute>} />
              <Route path="/accounts" element={<ProtectedRoute><PageWrapper><AccountsPage userId={user?.id} accounts={accounts} goals={goals} loadData={loadData}/></PageWrapper></ProtectedRoute>} />
              <Route path="/bills" element={<ProtectedRoute><PageWrapper><BillsPage userId={user?.id} accounts={accounts} loadData={loadData}/></PageWrapper></ProtectedRoute>} />
              <Route path="/transactions" element={<ProtectedRoute><PageWrapper><TransactionsPage userId={user?.id} accounts={accounts} transactions={transactions} budgets={budgets} taxEstimate={taxEstimate} incomeSources={incomeSources} loadData={loadData}/></PageWrapper></ProtectedRoute>} />
              <Route path="/trends" element={<ProtectedRoute><PageWrapper><TrendsPage snapshots={snapshots} transactions={transactions} budgets={budgets}/></PageWrapper></ProtectedRoute>} />
              <Route path="/settings" element={<ProtectedRoute><PageWrapper><SettingsPage /></PageWrapper></ProtectedRoute>} />
            </Routes>
          </AnimatePresence>
        </div>
        {user && !isSplashActive && (
          <QuickLog accounts={accounts} budgets={budgets} onTransactionAdded={loadData} />
        )}
      </div>

      <style>{`
        .vault-lock-overlay {
          position: fixed; inset: 0; z-index: 20000;
          background: rgba(0,0,0,0.95); backdrop-filter: blur(40px);
          display: flex; align-items: center; justify-content: center;
          padding: 20px;
        }
        .vault-lock-card {
          width: 100%; max-width: 400px; text-align: center; padding: 60px 40px;
          border: 2px solid var(--primary); box-shadow: 0 0 80px rgba(59, 130, 246, 0.4);
          background: #000000 !important;
        }
        .pin-error {
          border-color: var(--danger) !important;
          animation: shake 0.4s ease-in-out;
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-10px); }
          75% { transform: translateX(10px); }
        }
      `}</style>
    </>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <ModalProvider>
          <AppContent />
        </ModalProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
