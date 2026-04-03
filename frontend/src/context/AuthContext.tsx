import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { logout as apiLogout } from '../services/api';

interface AuthContextType {
  user: any | null;
  login: (user: any, token?: string) => void;
  logout: () => void;
  loading: boolean;
  isPrivacyMode: boolean;
  togglePrivacyMode: () => void;
  isEditMode: boolean;
  toggleEditMode: () => void;
  updateUserPreferences: (prefs: any) => Promise<void>;
  isLocked: boolean;
  lockVault: () => void;
  unlockVault: (pin: string) => boolean;
  setVaultPin: (pin: string) => void;
  hasVaultPin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const [isPrivacyMode, setIsPrivacyMode] = useState(
    localStorage.getItem('saphyr_privacy_mode') === 'true'
  );
  const [isEditMode, setIsEditMode] = useState(false);
  
  // VAULT LOCK STATE
  const [vaultPin, setInternalVaultPin] = useState(localStorage.getItem('saphyr_vault_pin') || '');
  const [isLocked, setIsLocked] = useState(false);

  // Validate session on mount
  useEffect(() => {
    const checkSession = async () => {
      try {
        const savedUser = localStorage.getItem('saphyr_user');
        if (savedUser) {
          setUser(JSON.parse(savedUser));
        }
      } catch (e) {
        localStorage.removeItem('saphyr_user');
      } finally {
        setLoading(false);
      }
    };
    checkSession();
  }, []);

  const login = (userData: any, token?: string) => {
    setUser(userData);
    localStorage.setItem('saphyr_user', JSON.stringify(userData));
    if (token) {
      localStorage.setItem('saphyr_token', token);
    }
  };

  const logout = async () => {
    try {
      await apiLogout();
    } catch (e) {
      console.error("Logout failed", e);
    }
    setUser(null);
    localStorage.removeItem('saphyr_user');
    localStorage.removeItem('saphyr_token');
    navigate('/login');
  };

  const updateUserPreferences = async (prefs: any) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001/api'}/auth/preferences`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(prefs),
        credentials: 'include'
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

  // VAULT IDLE TIMER (5 Minutes)
  useEffect(() => {
    if (!user || !vaultPin || isLocked) return;

    let vaultTimer: any;
    const resetVaultTimer = () => {
      if (vaultTimer) clearTimeout(vaultTimer);
      vaultTimer = setTimeout(() => {
        console.log("🔒 Vault Auto-Locked due to inactivity.");
        setIsLocked(true);
      }, 5 * 60 * 1000); 
    };

    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    events.forEach(event => document.addEventListener(event, resetVaultTimer));
    resetVaultTimer();

    return () => {
      if (vaultTimer) clearTimeout(vaultTimer);
      events.forEach(event => document.removeEventListener(event, resetVaultTimer));
    };
  }, [user, vaultPin, isLocked]);

  const lockVault = () => { if (vaultPin) setIsLocked(true); };
  const unlockVault = (pin: string) => {
    if (pin === vaultPin) {
      setIsLocked(false);
      return true;
    }
    return false;
  };
  const setVaultPin = (pin: string) => {
    setInternalVaultPin(pin);
    localStorage.setItem('saphyr_vault_pin', pin);
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

    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    events.forEach(event => document.addEventListener(event, resetTimer));

    resetTimer();

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
      user, login, logout, loading, 
      isPrivacyMode, togglePrivacyMode,
      isEditMode, toggleEditMode,
      updateUserPreferences,
      isLocked, lockVault, unlockVault, setVaultPin,
      hasVaultPin: !!vaultPin
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
