import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { login as loginApi, verify2FA } from '../../services/api';

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [show2FA, setShow2FA] = useState(false);
  const [twoFactorData, setTwoFactorData] = useState<any>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const data = await loginApi({ email, password });
      if (data.error) {
        setError(data.error);
      } else if (data.require_2fa) {
        setTwoFactorData(data);
        setShow2FA(true);
      } else {
        login(data.user);
        navigate('/');
      }
    } catch (err) {
      setError('Failed to connect to server');
    } finally {
      setLoading(false);
    }
  };

  const handle2FAVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const data = await verify2FA({ 
        userId: twoFactorData.userId, 
        code: twoFactorCode 
      });

      if (data.error) {
        setError(data.error);
      } else {
        login(data.user);
        navigate('/');
      }
    } catch (err) {
      setError('Verification failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '400px', margin: '100px auto', padding: '20px' }}>
      <div className="card" style={{ borderTop: '5px solid var(--primary)' }}>
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <div className="logo-icon" style={{ margin: '0 auto 15px auto' }}></div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--primary)' }}>
            {show2FA ? 'Verify Identity' : 'Login to Saphyr'}
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '5px' }}>
            {show2FA ? `We sent a code to ${twoFactorData?.email}` : 'Enter your credentials to continue'}
          </p>
        </div>

        {error && (
          <div style={{ background: 'rgba(244, 63, 94, 0.1)', color: 'var(--danger)', padding: '12px', borderRadius: '12px', marginBottom: '20px', fontSize: '0.85rem', textAlign: 'center', fontWeight: 600 }}>
            {error}
          </div>
        )}

        {show2FA ? (
          <form onSubmit={handle2FAVerify}>
            <div className="form-group">
              <label>Verification Code</label>
              <input 
                type="text" 
                required 
                value={twoFactorCode} 
                onChange={e => setTwoFactorCode(e.target.value)} 
                placeholder="6-digit code"
                maxLength={6}
                style={{ textAlign: 'center', fontSize: '1.5rem', letterSpacing: '0.5em', fontWeight: 800 }}
              />
            </div>
            <button type="submit" disabled={loading} style={{ marginTop: '10px' }}>
              {loading ? 'Verifying...' : 'Verify & Sign In'}
            </button>
            <button 
              type="button" 
              onClick={() => setShow2FA(false)}
              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', width: '100%', marginTop: '15px', fontSize: '0.85rem', boxShadow: 'none' }}
            >
              Back to Login
            </button>
          </form>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Email Address</label>
              <input 
                type="email" 
                required 
                value={email} 
                onChange={e => setEmail(e.target.value)} 
                placeholder="name@example.com"
              />
            </div>
            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <label>Password</label>
                  <button 
                    type="button" 
                    onClick={() => setShowPassword(!showPassword)}
                    style={{ background: 'none', border: 'none', color: 'var(--primary)', fontSize: '0.65rem', fontWeight: 800, padding: 0, width: 'auto', boxShadow: 'none', cursor: 'pointer', marginTop: 0 }}
                  >
                    [{showPassword ? 'HIDE' : 'SHOW'}]
                  </button>
                </div>
                <Link to="/forgot-password" style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 600, textDecoration: 'none' }}>Forgot?</Link>
              </div>
              <input 
                type={showPassword ? 'text' : 'password'} 
                required 
                value={password} 
                onChange={e => setPassword(e.target.value)} 
                placeholder="••••••••"
              />
            </div>
            
            <button type="submit" disabled={loading} style={{ marginTop: '10px' }}>
              {loading ? 'Logging in...' : 'Sign In'}
            </button>
          </form>
        )}

        {!show2FA && (
          <p style={{ textAlign: 'center', marginTop: '25px', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
            Don't have an account? <Link to="/signup" style={{ color: 'var(--primary)', fontWeight: 700, textDecoration: 'none' }}>Create one</Link>
          </p>
        )}
      </div>
    </div>
  );
};

export default LoginPage;
