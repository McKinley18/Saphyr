import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { resetPassword } from '../../services/api';

const ResetPasswordPage: React.FC = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  useEffect(() => {
    if (!token) {
      setError('Invalid or missing reset token');
    }
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      return setError('Passwords do not match');
    }

    if (password.length < 6) {
      return setError('Password must be at least 6 characters');
    }

    setLoading(true);

    try {
      const data = await resetPassword({ token, newPassword: password });
      if (data.error) {
        setError(data.error);
      } else {
        setSuccess(true);
        setTimeout(() => navigate('/login'), 3000);
      }
    } catch (err) {
      setError('Failed to connect to server');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '400px', margin: '100px auto', padding: '20px' }}>
      <div className="card" style={{ borderTop: '5px solid var(--primary)' }}>
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <div className="logo-icon" style={{ margin: '0 auto 15px auto' }}></div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--primary)' }}>New Password</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '5px' }}>Set your secure new password</p>
        </div>

        {error && (
          <div style={{ background: 'rgba(244, 63, 94, 0.1)', color: 'var(--danger)', padding: '12px', borderRadius: '12px', marginBottom: '20px', fontSize: '0.85rem', textAlign: 'center', fontWeight: 600 }}>
            ⚠️ {error}
          </div>
        )}

        {success ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{ background: 'rgba(34, 197, 94, 0.1)', color: 'var(--success)', padding: '15px', borderRadius: '12px', marginBottom: '20px', fontSize: '0.9rem', fontWeight: 600 }}>
              ✅ Password reset successfully! Redirecting to login...
            </div>
            <Link to="/login" style={{ color: 'var(--primary)', fontWeight: 700, textDecoration: 'none' }}>Go to login now</Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <label>New Password</label>
                <button 
                  type="button" 
                  onClick={() => setShowPassword(!showPassword)}
                  style={{ background: 'none', border: 'none', color: 'var(--primary)', fontSize: '0.65rem', fontWeight: 800, padding: 0, width: 'auto', boxShadow: 'none', cursor: 'pointer', marginTop: 0 }}
                >
                  [{showPassword ? 'HIDE' : 'SHOW'}]
                </button>
              </div>
              <input 
                type={showPassword ? 'text' : 'password'} 
                required 
                value={password} 
                onChange={e => setPassword(e.target.value)} 
                placeholder="••••••••"
                disabled={!token}
              />
            </div>
            <div className="form-group">
              <label>Confirm New Password</label>
              <input 
                type={showPassword ? 'text' : 'password'} 
                required 
                value={confirmPassword} 
                onChange={e => setConfirmPassword(e.target.value)} 
                placeholder="••••••••"
                disabled={!token}
              />
            </div>
            
            <button type="submit" disabled={loading || !token} style={{ marginTop: '10px' }}>
              {loading ? 'Resetting...' : 'Update Password'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default ResetPasswordPage;
