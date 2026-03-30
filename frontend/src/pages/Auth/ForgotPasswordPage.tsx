import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { forgotPassword } from '../../services/api';

const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    try {
      const data = await forgotPassword(email);
      if (data.error) {
        setError(data.error);
      } else {
        setMessage('Reset instructions have been sent to your email.');
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
          <h2 style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--primary)' }}>Reset Password</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '5px' }}>Enter your email to receive a reset link</p>
        </div>

        {error && (
          <div style={{ background: 'rgba(244, 63, 94, 0.1)', color: 'var(--danger)', padding: '12px', borderRadius: '12px', marginBottom: '20px', fontSize: '0.85rem', textAlign: 'center', fontWeight: 600 }}>
            ⚠️ {error}
          </div>
        )}

        {message && (
          <div style={{ background: 'rgba(34, 197, 94, 0.1)', color: 'var(--success)', padding: '12px', borderRadius: '12px', marginBottom: '20px', fontSize: '0.85rem', textAlign: 'center', fontWeight: 600 }}>
            ✅ {message}
          </div>
        )}

        {!message ? (
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
            
            <button type="submit" disabled={loading} style={{ marginTop: '10px' }}>
              {loading ? 'Sending...' : 'Send Reset Link'}
            </button>
          </form>
        ) : (
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '20px' }}>Please check your inbox (and spam folder) for the link.</p>
          </div>
        )}

        <p style={{ textAlign: 'center', marginTop: '25px', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
          Remember your password? <Link to="/login" style={{ color: 'var(--primary)', fontWeight: 700, textDecoration: 'none' }}>Back to login</Link>
        </p>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
