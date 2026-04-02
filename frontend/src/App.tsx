import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
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
import { AuthProvider, useAuth } from './context/AuthContext';
import { ModalProvider } from './context/ModalContext';
import BottomNav from './components/BottomNav/BottomNav';

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

  const { user, loading: authLoading, logout } = useAuth();
  
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

  const toggleTheme = () => {
    setTheme(prev => {
      if (prev === 'light') return 'dark';
      if (prev === 'dark') return 'oled';
      return 'light';
    });
  };

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

      // Filter out invalid responses (e.g., if one service is down)
      const validResponses = responses.filter(res => res && !res.error);
      
      // Check for unauthorized errors specifically
      const unauthorized = responses.some(res => 
        res && (res.error === 'Authentication required' || res.status === 401 || (typeof res.error === 'string' && res.error.includes('JWT')))
      );
      
      if (unauthorized) {
        console.error("🚫 Saphyr: Session Invalid. Redirecting...");
        // On mobile, sometimes cookies aren't ready yet or network blips occur. 
        // Only logout if we are sure user isn't locally cached.
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
      setLastFetched(now);
      setRetryCount(0); // Reset on success
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
          console.error("🚨 Saphyr: Too many failures. Resetting session...");
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
    e.preventDefault();
    try {
      await updateSalaryProfile(extraData);
      await loadData(true);
    } catch (err: any) {
      setError("Failed to update salary: " + err.message);
    }
  };

  return (
    <>
      <div className={`splash-overlay ${!isSplashActive ? 'hidden' : ''}`}>
        <div className="forge-logo"></div>
      </div>

      <div style={{ 
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
        <Navbar theme={theme} toggleTheme={toggleTheme} />
        <div className="container">
          {error && (
            <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', padding: '15px', borderRadius: '12px', marginBottom: '20px', border: '1px solid var(--danger)', textAlign: 'center', fontSize: '0.9rem', fontWeight: 700 }}>
              {error}
              <button onClick={() => setError(null)} style={{ marginLeft: '15px', background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', padding: 0, width: 'auto', boxShadow: 'none' }}>DISMISS</button>
            </div>
          )}
          <Routes>
            <Route path="/login" element={user ? <Navigate to="/" /> : <LoginPage />} />
            <Route path="/signup" element={user ? <Navigate to="/" /> : <SignupPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            
            <Route path="/" element={<ProtectedRoute><Dashboard taxEstimate={taxEstimate} accounts={accounts} transactions={transactions} incomeSources={incomeSources} snapshots={snapshots}/></ProtectedRoute>} />
            <Route path="/income" element={<ProtectedRoute><IncomePage userId={user?.id} savedSalary={salary} taxEstimate={taxEstimate} incomeSources={incomeSources} handleSalarySubmit={handleSalarySubmit} loadData={loadData}/></ProtectedRoute>} />
            <Route path="/accounts" element={<ProtectedRoute><AccountsPage userId={user?.id} accounts={accounts} goals={goals} loadData={loadData}/></ProtectedRoute>} />
            <Route path="/bills" element={<ProtectedRoute><BillsPage userId={user?.id} accounts={accounts} loadData={loadData}/></ProtectedRoute>} />
            <Route path="/transactions" element={<ProtectedRoute><TransactionsPage userId={user?.id} accounts={accounts} transactions={transactions} budgets={budgets} taxEstimate={taxEstimate} incomeSources={incomeSources} loadData={loadData}/></ProtectedRoute>} />
            <Route path="/trends" element={<ProtectedRoute><TrendsPage snapshots={snapshots} transactions={transactions} budgets={budgets}/></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
          </Routes>
        </div>
        {user && !isSplashActive && (
          <QuickLog accounts={accounts} budgets={budgets} onTransactionAdded={loadData} />
        )}
      </div>
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
