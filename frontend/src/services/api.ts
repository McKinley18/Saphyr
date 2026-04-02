const API_URL = import.meta.env.VITE_API_URL || 
  (import.meta.env.PROD ? 'https://saphyr-api.onrender.com/api' : 'http://localhost:3001/api');

console.log('📡 Saphyr API Layer initialized at:', API_URL);

const getHeaders = () => {
  const headers: any = {
    'Content-Type': 'application/json'
  };
  const token = localStorage.getItem('saphyr_token');
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
};

export const signup = async (data: any) => {
  const response = await fetch(`${API_URL}/auth/signup`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(data),
    credentials: 'include'
  });
  return response.json();
};

export const login = async (data: any) => {
  const response = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(data),
    credentials: 'include'
  });
  return response.json();
};

export const logout = async () => {
  const response = await fetch(`${API_URL}/auth/logout`, {
    method: 'POST',
    headers: getHeaders(),
    credentials: 'include'
  });
  return response.json();
};

export const verify2FA = async (data: any) => {
  const response = await fetch(`${API_URL}/auth/verify-2fa`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(data),
    credentials: 'include'
  });
  return response.json();
};

export const forgotPassword = async (email: string) => {
  const response = await fetch(`${API_URL}/auth/forgot-password`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ email }),
    credentials: 'include'
  });
  return response.json();
};

export const resetPassword = async (data: any) => {
  const response = await fetch(`${API_URL}/auth/reset-password`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(data),
    credentials: 'include'
  });
  return response.json();
};

export const updatePassword = async (data: any) => {
  const response = await fetch(`${API_URL}/auth/update-password`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(data),
    credentials: 'include'
  });
  return response.json();
};

export const deleteAccountApi = async () => {
  const response = await fetch(`${API_URL}/auth/delete-account`, {
    method: 'DELETE',
    headers: getHeaders(),
    credentials: 'include'
  });
  return response.json();
};

export const resetAccountApi = async () => {
  const response = await fetch(`${API_URL}/auth/reset-account`, {
    method: 'POST',
    headers: getHeaders(),
    credentials: 'include'
  });
  return response.json();
};

export const fetchAccounts = async () => {
  const response = await fetch(`${API_URL}/accounts`, { headers: getHeaders(), credentials: 'include' });
  return response.json();
};

export const createAccount = async (data: any) => {
  const response = await fetch(`${API_URL}/accounts`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(data),
    credentials: 'include'
  });
  return response.json();
};

export const updateAccount = async (id: string, data: any) => {
  const response = await fetch(`${API_URL}/accounts/${id}`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify(data),
    credentials: 'include'
  });
  return response.json();
};

export const deleteAccount = async (id: string) => {
  const response = await fetch(`${API_URL}/accounts/${id}`, {
    method: 'DELETE',
    headers: getHeaders(),
    credentials: 'include'
  });
  return response.json();
};

export const fetchTransactions = async () => {
  const response = await fetch(`${API_URL}/transactions`, { headers: getHeaders(), credentials: 'include' });
  return response.json();
};

export const createTransaction = async (data: any) => {
  const response = await fetch(`${API_URL}/transactions`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(data),
    credentials: 'include'
  });
  return response.json();
};

export const deleteTransaction = async (id: string) => {
  const response = await fetch(`${API_URL}/transactions/${id}`, {
    method: 'DELETE',
    headers: getHeaders(),
    credentials: 'include'
  });
  return response.json();
};

export const fetchTaxEstimate = async () => {
  const response = await fetch(`${API_URL}/tax/estimate?t=${Date.now()}`, { headers: getHeaders(), credentials: 'include' });
  return response.json();
};

export const fetchTaxProfile = async () => {
  const response = await fetch(`${API_URL}/tax/profile`, { headers: getHeaders(), credentials: 'include' });
  return response.json();
};

export const updateTaxProfile = async (data: any) => {
  const response = await fetch(`${API_URL}/tax/profile`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(data),
    credentials: 'include'
  });
  return response.json();
};

export const seedTaxBrackets = async () => {
  const response = await fetch(`${API_URL}/tax/seed-brackets`, { 
    method: 'POST',
    headers: getHeaders(),
    credentials: 'include'
  });
  return response.json();
};

export const fetchSalaryProfile = async () => {
  const response = await fetch(`${API_URL}/salary`, { headers: getHeaders(), credentials: 'include' });
  return response.json();
};

export const updateSalaryProfile = async (data: any) => {
  const response = await fetch(`${API_URL}/salary`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(data),
    credentials: 'include'
  });
  return response.json();
};

export const addDeduction = async (data: any) => {
  const response = await fetch(`${API_URL}/salary/deductions`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(data),
    credentials: 'include'
  });
  return response.json();
};

export const deleteDeduction = async (id: string) => {
  const response = await fetch(`${API_URL}/salary/deductions/${id}`, {
    method: 'DELETE',
    headers: getHeaders(),
    credentials: 'include'
  });
  return response.json();
};

// Budget API
export const fetchBudgets = async () => {
  const response = await fetch(`${API_URL}/budgets`, { headers: getHeaders(), credentials: 'include' });
  return response.json();
};

export const createBudget = async (data: any) => {
  const response = await fetch(`${API_URL}/budgets`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(data),
    credentials: 'include'
  });
  return response.json();
};

export const deleteBudget = async (id: string) => {
  const response = await fetch(`${API_URL}/budgets/${id}`, {
    method: 'DELETE',
    headers: getHeaders(),
    credentials: 'include'
  });
  return response.json();
};

// Income Sources API
export const fetchIncomeSources = async () => {
  const response = await fetch(`${API_URL}/income-sources`, { headers: getHeaders(), credentials: 'include' });
  return response.json();
};

export const createIncomeSource = async (data: any) => {
  const response = await fetch(`${API_URL}/income-sources`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(data),
    credentials: 'include'
  });
  return response.json();
};

export const deleteIncomeSource = async (id: string) => {
  const response = await fetch(`${API_URL}/income-sources/${id}`, {
    method: 'DELETE',
    headers: getHeaders(),
    credentials: 'include'
  });
  return response.json();
};

// Snapshots API
export const fetchSnapshots = async () => {
  const response = await fetch(`${API_URL}/snapshots`, { headers: getHeaders(), credentials: 'include' });
  return response.json();
};

export const createSnapshot = async (data: any) => {
  const response = await fetch(`${API_URL}/snapshots`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(data),
    credentials: 'include'
  });
  return response.json();
};

// Savings Goals API
export const fetchGoals = async () => {
  const response = await fetch(`${API_URL}/goals`, { headers: getHeaders(), credentials: 'include' });
  return response.json();
};

export const createGoal = async (data: any) => {
  const response = await fetch(`${API_URL}/goals`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(data),
    credentials: 'include'
  });
  return response.json();
};

export const updateGoal = async (id: string, data: any) => {
  const response = await fetch(`${API_URL}/goals/${id}`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify(data),
    credentials: 'include'
  });
  return response.json();
};

export const deleteGoal = async (id: string) => {
  const response = await fetch(`${API_URL}/goals/${id}`, {
    method: 'DELETE',
    headers: getHeaders(),
    credentials: 'include'
  });
  return response.json();
};
