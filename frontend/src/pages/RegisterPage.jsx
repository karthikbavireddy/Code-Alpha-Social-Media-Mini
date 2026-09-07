import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { UserPlus, Sparkles, Loader2 } from 'lucide-react';

export default function RegisterPage({ onSwitchToLogin, onSuccess }) {
  const { register } = useAuth();
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirm_password: '',
    bio: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.password !== formData.confirm_password) {
      setError('Passwords do not match.');
      return;
    }
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await register(formData);
      if (onSuccess) onSuccess();
    } catch (err) {
      setError(err.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ width: '100%', maxWidth: '460px', margin: '30px auto 0 auto' }}>
      <div className="glass-card animate-fade-in" style={{ padding: '32px' }}>
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div
            style={{
              width: '52px',
              height: '52px',
              borderRadius: '14px',
              background: 'linear-gradient(135deg, #6366f1, #d946ef)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px auto',
              boxShadow: '0 0 24px rgba(217, 70, 239, 0.35)',
            }}
          >
            <Sparkles size={28} color="#fff" />
          </div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: '800', color: '#fff', marginBottom: '6px' }}>
            Create Account
          </h1>
          <p style={{ fontSize: '0.86rem', color: 'var(--text-muted)' }}>
            Join the ConnectSphere community today
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
            <label className="input-label">Username</label>
            <input
              type="text"
              name="username"
              className="input-field"
              placeholder="e.g. janesmith"
              value={formData.username}
              onChange={handleChange}
              required
            />
          </div>

          <div className="input-group">
            <label className="input-label">Email Address</label>
            <input
              type="email"
              name="email"
              className="input-field"
              placeholder="jane@example.com"
              value={formData.email}
              onChange={handleChange}
              required
            />
          </div>

          <div className="input-group">
            <label className="input-label">Password</label>
            <input
              type="password"
              name="password"
              className="input-field"
              placeholder="At least 6 characters"
              value={formData.password}
              onChange={handleChange}
              required
            />
          </div>

          <div className="input-group">
            <label className="input-label">Confirm Password</label>
            <input
              type="password"
              name="confirm_password"
              className="input-field"
              placeholder="Repeat password"
              value={formData.confirm_password}
              onChange={handleChange}
              required
            />
          </div>

          <div className="input-group">
            <label className="input-label">Bio (Optional)</label>
            <textarea
              name="bio"
              className="input-field"
              placeholder="Tell others what you build, love, or explore..."
              rows={2}
              value={formData.bio}
              onChange={handleChange}
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
                <Loader2 size={18} className="animate-spin" /> Creating Account...
              </>
            ) : (
              <>
                <UserPlus size={18} /> Sign Up
              </>
            )}
          </button>
        </form>

        <div style={{ marginTop: '20px', textAlign: 'center', fontSize: '0.86rem', color: 'var(--text-muted)' }}>
          Already have an account?{' '}
          <span
            onClick={onSwitchToLogin}
            style={{ color: 'var(--primary)', fontWeight: '600', cursor: 'pointer', textDecoration: 'underline' }}
          >
            Sign in
          </span>
        </div>
      </div>
    </div>
  );
}
