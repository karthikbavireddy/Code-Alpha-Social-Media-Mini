import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { LogIn, Sparkles, Loader2, KeyRound, UserCheck } from 'lucide-react';

export default function LoginPage({ onSwitchToRegister, onSuccess }) {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username || !password) {
      setError('Please fill in both fields.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await login(username, password);
      if (onSuccess) onSuccess();
    } catch (err) {
      setError(err.message || 'Login failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleFillDemo = (demoUser, demoPass) => {
    setUsername(demoUser);
    setPassword(demoPass);
    setError(null);
  };

  return (
    <div style={{ width: '100%', maxWidth: '440px', margin: '40px auto 0 auto' }}>
      <div className="glass-card animate-fade-in" style={{ padding: '32px' }}>
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div
            style={{
              width: '52px',
              height: '52px',
              borderRadius: '14px',
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px auto',
              boxShadow: '0 0 24px rgba(99, 102, 241, 0.4)',
            }}
          >
            <Sparkles size={28} color="#fff" />
          </div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: '800', color: '#fff', marginBottom: '6px' }}>
            Welcome Back
          </h1>
          <p style={{ fontSize: '0.86rem', color: 'var(--text-muted)' }}>
            Enter your credentials to enter the sphere
          </p>
        </div>

        {error && (
          <div
            style={{
              padding: '10px 14px',
              borderRadius: 'var(--radius-sm)',
              background: 'rgba(244, 63, 94, 0.12)',
              border: '1px solid rgba(244, 63, 94, 0.3)',
              color: '#fca5a5',
              fontSize: '0.85rem',
              marginBottom: '18px',
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label className="input-label">Username or Email</label>
            <input
              type="text"
              className="input-field"
              placeholder="e.g. alice or alice@connectsphere.io"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoFocus
              required
            />
          </div>

          <div className="input-group">
            <label className="input-label">Password</label>
            <input
              type="password"
              className="input-field"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            style={{ width: '100%', marginTop: '8px', padding: '12px' }}
          >
            {loading ? (
              <>
                <Loader2 size={18} className="animate-spin" /> Authenticating...
              </>
            ) : (
              <>
                <LogIn size={18} /> Sign In
              </>
            )}
          </button>
        </form>

        {/* Demo Credentials Helper */}
        <div
          style={{
            marginTop: '24px',
            paddingTop: '20px',
            borderTop: '1px solid var(--border-subtle)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.78rem',
              color: 'var(--text-muted)',
              marginBottom: '10px',
            }}
          >
            <KeyRound size={14} color="var(--primary)" />
            <span>Quick Demo Accounts (1-Click Fill):</span>
          </div>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => handleFillDemo('alice', 'password123')}
              style={{ fontSize: '0.76rem', padding: '4px 10px' }}
            >
              @alice
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => handleFillDemo('bob', 'password123')}
              style={{ fontSize: '0.76rem', padding: '4px 10px' }}
            >
              @bob
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => handleFillDemo('admin', 'adminpassword')}
              style={{ fontSize: '0.76rem', padding: '4px 10px' }}
            >
              @admin
            </button>
          </div>
        </div>

        {/* Switch to Register */}
        <div style={{ marginTop: '20px', textAlign: 'center', fontSize: '0.86rem', color: 'var(--text-muted)' }}>
          Don't have an account?{' '}
          <span
            onClick={onSwitchToRegister}
            style={{ color: 'var(--primary)', fontWeight: '600', cursor: 'pointer', textDecoration: 'underline' }}
          >
            Create one
          </span>
        </div>
      </div>
    </div>
  );
}
