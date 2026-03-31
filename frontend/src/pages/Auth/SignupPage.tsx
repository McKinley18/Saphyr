import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { signup as signupApi } from '../../services/api';

const SignupPage: React.FC = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    full_name: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      return setError('Passwords do not match');
    }

    if (formData.password.length < 6) {
      return setError('Password must be at least 6 characters');
    }

    setLoading(true);

    try {
      const data = await signupApi({ 
        email: formData.email, 
        password: formData.password,
        full_name: formData.full_name
      });
      
      if (data.error) {
        setError(data.error);
      } else {
        login(data.user, data.token);
        navigate('/');
      }
    } catch (err) {
      setError('Failed to connect to server');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '400px', margin: '80px auto', padding: '20px' }}>
      <div className="card" style={{ borderTop: '5px solid var(--primary)' }}>
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <div className="logo-icon" style={{ margin: '0 auto 15px auto' }}></div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--primary)' }}>Create Your Account</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '5px' }}>Join Saphyr and start tracking</p>
        </div>

        {error && (
          <div style={{ background: 'rgba(244, 63, 94, 0.1)', color: 'var(--danger)', padding: '12px', borderRadius: '12px', marginBottom: '20px', fontSize: '0.85rem', textAlign: 'center', fontWeight: 600 }}>
            {error}
          </div>
        )}

        {loading && (
          <div style={{ textAlign: 'center', marginBottom: '20px', color: 'var(--primary)', fontSize: '0.85rem', fontWeight: 600, animation: 'pulse 2s infinite' }}>
            Waking up the secure server... (This takes ~30s if idle)
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Full Name</label>
            <input 
              type="text" 
              required 
              value={formData.full_name} 
              onChange={e => setFormData({...formData, full_name: e.target.value})} 
              placeholder="John Doe"
            />
          </div>
          <div className="form-group">
            <label>Email Address</label>
            <input 
              type="email" 
              required 
              value={formData.email} 
              onChange={e => setFormData({...formData, email: e.target.value})} 
              placeholder="name@example.com"
            />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input 
              type="password" 
              required 
              value={formData.password} 
              onChange={e => setFormData({...formData, password: e.target.value})} 
              placeholder="••••••••"
            />
          </div>
          <div className="form-group">
            <label>Confirm Password</label>
            <input 
              type="password" 
              required 
              value={formData.confirmPassword} 
              onChange={e => setFormData({...formData, confirmPassword: e.target.value})} 
              placeholder="••••••••"
            />
          </div>
          
          <button type="submit" disabled={loading} style={{ marginTop: '10px' }}>
            {loading ? 'Creating Account...' : 'Get Started'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: '25px', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
          Already have an account? <Link to="/login" style={{ color: 'var(--primary)', fontWeight: 700, textDecoration: 'none' }}>Log in</Link>
        </p>
      </div>
    </div>
  );
};

export default SignupPage;
