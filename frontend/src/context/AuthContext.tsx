import React, { createContext, useContext, useState, useEffect } from 'react';

interface AuthContextType {
  user: any | null;
  token: string | null;
  login: (user: any, token: string) => void;
  logout: () => void;
  loading: boolean;
  isPrivacyMode: boolean;
  togglePrivacyMode: () => void;
  isEditMode: boolean;
  toggleEditMode: () => void;
  updateUserPreferences: (prefs: any) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<any | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPrivacyMode, setIsPrivacyMode] = useState(
    localStorage.getItem('saphyr_privacy_mode') === 'true'
  );
  const [isEditMode, setIsEditMode] = useState(false);

  useEffect(() => {
    const savedUser = localStorage.getItem('saphyr_user');
    const savedToken = localStorage.getItem('saphyr_token');
    
    if (savedUser && savedToken) {
      try {
        setUser(JSON.parse(savedUser));
        setToken(savedToken);
      } catch (e) {
        console.error("Failed to parse saved user", e);
        localStorage.removeItem('saphyr_user');
        localStorage.removeItem('saphyr_token');
      }
    }
    setLoading(false);
  }, []);

  const login = (user: any, token: string) => {
    setUser(user);
    setToken(token);
    localStorage.setItem('saphyr_user', JSON.stringify(user));
    localStorage.setItem('saphyr_token', token);
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('saphyr_user');
    localStorage.removeItem('saphyr_token');
    window.location.href = '/login';
  };

  const updateUserPreferences = async (prefs: any) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001/api'}/auth/preferences`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(prefs)
      });
      const data = await response.json();
      if (data.user) {
        setUser(data.user);
        localStorage.setItem('saphyr_user', JSON.stringify(data.user));
      }
    } catch (err) {
      console.error("Failed to update preferences", err);
    }
  };

  // Auto-Logout Logic
  useEffect(() => {
    if (!user || !user.auto_logout_minutes || user.auto_logout_minutes === 0) return;

    let logoutTimer: any;
    const timeoutMs = user.auto_logout_minutes * 60 * 1000;

    const resetTimer = () => {
      if (logoutTimer) clearTimeout(logoutTimer);
      logoutTimer = setTimeout(() => {
        console.log("Auto-logging out due to inactivity...");
        logout();
      }, timeoutMs);
    };

    // Events that reset the timer
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    events.forEach(event => document.addEventListener(event, resetTimer));

    resetTimer(); // Start timer on mount

    return () => {
      if (logoutTimer) clearTimeout(logoutTimer);
      events.forEach(event => document.removeEventListener(event, resetTimer));
    };
  }, [user]);

  const togglePrivacyMode = () => {
    setIsPrivacyMode(prev => {
      const newValue = !prev;
      localStorage.setItem('saphyr_privacy_mode', newValue.toString());
      return newValue;
    });
  };

  const toggleEditMode = () => {
    setIsEditMode(prev => !prev);
  };

  return (
    <AuthContext.Provider value={{ 
      user, token, login, logout, loading, 
      isPrivacyMode, togglePrivacyMode,
      isEditMode, toggleEditMode,
      updateUserPreferences
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
