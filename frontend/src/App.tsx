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

  const { user, loading: authLoading, logout } = useAuth();
  // Show splash on initial load
  useEffect(() => {
    if (authLoading) setIsSplashActive(true);
  }, []);

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
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
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

      // Check for unauthorized errors in any response
      const unauthorized = responses.some(res => res && res.error === 'Authentication required');
      if (unauthorized) {
        logout();
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
      setError("Sync failed. Using cached data.");
      setIsSplashActive(false); // Force splash off on error
    } finally {
      setLoading(false);
      // Ensure splash dies after a reasonable delay
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
        transition: 'opacity 1s ease',
        minHeight: '100vh'
      }}>
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
