import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, ArrowLeft, AlertCircle, Lock, User, Info } from 'lucide-react';

export function AdminLoginPage({ onNavigate }) {
  const { loginAdmin } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!username.trim() || !password.trim()) {
      setErrorMsg('Please enter both username and password.');
      return;
    }

    setIsLoading(true);
    const result = loginAdmin(username.trim(), password.trim());
    setIsLoading(false);

    if (result.success) {
      onNavigate('/admin/dashboard');
    } else {
      setErrorMsg(result.error || 'Invalid Admin Username or Password.');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, padding: '2rem 1rem' }}>
      <div style={{ maxWidth: '440px', width: '100%' }}>
        
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          style={{ marginBottom: '1.25rem' }}
          onClick={() => onNavigate('/')}
        >
          <ArrowLeft size={14} />
          <span>Back to Home</span>
        </button>

        <div className="card" style={{ padding: '2rem 1.75rem' }}>
          
          <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
            <div 
              style={{ 
                width: '48px', 
                height: '48px', 
                borderRadius: '12px', 
                background: '#f1f5f9', 
                color: '#0f172a',
                display: 'inline-flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                marginBottom: '0.75rem'
              }}
            >
              <ShieldCheck size={26} />
            </div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.25rem' }}>
              Admin Login
            </h1>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
              Sign in with coordinator credentials to access administrative tools.
            </p>
          </div>

          {errorMsg && (
            <div className="alert alert-error" style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
              <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
              <div style={{ fontSize: '0.875rem', lineHeight: '1.4' }}>
                {errorMsg}
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label" htmlFor="adminUser">
                Username
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  id="adminUser"
                  type="text"
                  className="form-control"
                  placeholder="admin"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="username"
                  autoFocus
                />
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
              <label className="form-label" htmlFor="adminPass">
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  id="adminPass"
                  type="password"
                  className="form-control"
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                />
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-block btn-lg"
              disabled={isLoading}
            >
              <Lock size={18} />
              <span>{isLoading ? 'Authenticating...' : 'Sign In as Admin'}</span>
            </button>
          </form>

        </div>

      </div>
    </div>
  );
}
