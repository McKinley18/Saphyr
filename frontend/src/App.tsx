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

function AppContent() {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [budgets, setBudgets] = useState<any[]>([]);
  const [incomeSources, setIncomeSources] = useState<any[]>([]);
  const [snapshots, setSnapshots] = useState<any[]>([]);
  const [goals, setGoals] = useState<any[]>([]);
  const [salary, setSalary] = useState({ annual_salary: 0, '401k_percent': 0 });
  const [salaryInput, setSalaryInput] = useState({ annual_salary: 0, '401k_percent': 0 });
  const [taxEstimate, setTaxEstimate] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');
  const [isBlurred, setIsBlurred] = useState(false);
  
  const { user, loading: authLoading } = useAuth();

  // Stealth Mode Implementation
  useEffect(() => {
    if (!user?.stealth_mode) {
      setIsBlurred(false);
      return;
    }

    const handleBlur = () => setIsBlurred(true);
    const handleFocus = () => setIsBlurred(false);

    window.addEventListener('blur', handleBlur);
    window.addEventListener('focus', handleFocus);

    return () => {
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('focus', handleFocus);
    };
  }, [user?.stealth_mode]);

  // Apply Accent Color
  useEffect(() => {
    if (user?.accent_color) {
      document.documentElement.style.setProperty('--primary', user.accent_color);
    }
  }, [user?.accent_color]);

  console.log("App State:", { authLoading, loading, user: !!user, error });

  useEffect(() => {
    window.onerror = function(message, _source, lineno) {
      alert(`RUNTIME ERROR: ${message} at line ${lineno}`);
      return false;
    };
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  const loadData = async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    
    try {
      const [accs, txs, sal, tax, bdgs, incSrcs, snps, gls] = await Promise.all([
        fetchAccounts(),
        fetchTransactions(),
        fetchSalaryProfile(),
        fetchTaxEstimate(),
        fetchBudgets(),
        fetchIncomeSources(),
        fetchSnapshots(),
        fetchGoals()
      ]);
      
      setAccounts(accs || []);
      setTransactions(txs || []);
      setSalary(sal || { annual_salary: 0, '401k_percent': 0 });
      setSalaryInput(sal || { annual_salary: 0, '401k_percent': 0 });
      setTaxEstimate(tax);
      setBudgets(bdgs || []);
      setIncomeSources(incSrcs || []);
      setSnapshots(snps || []);
      setGoals(gls || []);
      setError(null);

      // Daily Snapshot Capture
      if (accs && accs.length > 0) {
        const totalCash = accs
          .filter((a: any) => !a.is_bill && (['Checking', 'Savings', 'Cash Accounts'].includes(a.type) || a.group_name === 'Cash Accounts' || parseFloat(a.balance) > 0))
          .reduce((sum: number, a: any) => sum + parseFloat(a.balance), 0);
        const totalDebt = accs
          .filter((a: any) => a.is_bill || ['Credit Card', 'Loan'].includes(a.type) || parseFloat(a.balance) < 0)
          .reduce((sum: number, a: any) => sum + Math.abs(parseFloat(a.balance)), 0);
        
        await createSnapshot({
          net_worth: totalCash - totalDebt,
          total_cash: totalCash,
          total_debt: totalDebt
        });
      }
    } catch (e: any) {
      console.error("Failed to load data", e);
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading) {
      if (user) {
        loadData();
      } else {
        setLoading(false);
      }
    }
  }, [user, authLoading]);
  const handleSalarySubmit = async (e: any, filingStatus?: string) => {
    e.preventDefault();
    try {
      const response = await updateSalaryProfile({
        annual_salary: salaryInput.annual_salary,
        contribution_401k_percent: salaryInput['401k_percent'],
        filing_status: filingStatus
      });
      
      // Use the estimate directly from the response for 100% sync
      if (response.taxEstimate) {
        setTaxEstimate(response.taxEstimate);
        // Also update the core salary state so display labels are fresh
        setSalary({
          annual_salary: response.taxEstimate.input_salary,
          '401k_percent': response.taxEstimate.input_401k_percent * 100,
          filing_status: response.taxEstimate.filing_status
        });
      }
      
      // Refresh the rest of the data in background
      await loadData();
      
      // Reset only the input boxes to zero as requested
      setSalaryInput({ annual_salary: 0, '401k_percent': 0 });
    } catch (err: any) {
      setError("Failed to update salary: " + err.message);
    }
  };

  if (authLoading || (user && loading)) {
    return <div className="container" style={{ padding: '100px', textAlign: 'center' }}><h3>Saphyr is loading...</h3></div>;
  }

  if (error && user) {
    return (
      <div className="container" style={{ padding: '50px' }}>
        <div className="card" style={{ border: '2px solid red', textAlign: 'center' }}>
          <h2 style={{ color: 'red' }}>⚠️ Connection Error</h2>
          <p>We couldn't connect to the database. Make sure your server is running.</p>
          <p style={{ fontSize: '0.8rem', color: '#64748b' }}>Error: {error}</p>
          <button onClick={() => window.location.reload()} style={{ width: 'auto', marginTop: '20px' }}>Retry Connection</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ 
      filter: isBlurred ? 'blur(20px)' : 'none', 
      transition: 'filter 0.3s ease',
      minHeight: '100vh'
    }}>
      <Navbar theme={theme} toggleTheme={toggleTheme} />
      <div className="container">
        <Routes>
          <Route path="/login" element={user ? <Navigate to="/" /> : <LoginPage />} />
          <Route path="/signup" element={user ? <Navigate to="/" /> : <SignupPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          
          <Route path="/" element={
            <ProtectedRoute>
              <Dashboard 
                taxEstimate={taxEstimate}
                accounts={accounts}
                transactions={transactions}
                incomeSources={incomeSources}
                loadData={loadData}
              />
            </ProtectedRoute>
          } />
          <Route path="/income" element={
            <ProtectedRoute>
              <IncomePage 
                userId={user?.id}
                salary={salaryInput}
                setSalary={setSalaryInput}
                savedSalary={salary}
                taxEstimate={taxEstimate}
                accounts={accounts}
                incomeSources={incomeSources}
                handleSalarySubmit={handleSalarySubmit}
                loadData={loadData}
              />
            </ProtectedRoute>
          } />
          <Route path="/accounts" element={
            <ProtectedRoute>
              <AccountsPage 
                userId={user?.id}
                accounts={accounts}
                goals={goals}
                loadData={loadData}
              />
            </ProtectedRoute>
          } />
          <Route path="/bills" element={
            <ProtectedRoute>
              <BillsPage 
                userId={user?.id}
                accounts={accounts}
                loadData={loadData}
              />
            </ProtectedRoute>
          } />
          <Route path="/transactions" element={
            <ProtectedRoute>
              <TransactionsPage 
                userId={user?.id}
                accounts={accounts}
                transactions={transactions}
                budgets={budgets}
                taxEstimate={taxEstimate}
                incomeSources={incomeSources}
                loadData={loadData}
              />
            </ProtectedRoute>
          } />
          <Route path="/trends" element={
            <ProtectedRoute>
              <TrendsPage 
                snapshots={snapshots}
                transactions={transactions}
                budgets={budgets}
              />
            </ProtectedRoute>
          } />
          <Route path="/settings" element={
            <ProtectedRoute>
              <SettingsPage />
            </ProtectedRoute>
          } />
        </Routes>
      </div>
      {user && (
        <QuickLog 
          accounts={accounts} 
          budgets={budgets} 
          onTransactionAdded={loadData} 
        />
      )}
    </div>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </Router>
  );
}

export default App;
