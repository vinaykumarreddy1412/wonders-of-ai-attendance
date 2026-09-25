import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { UserCheck, ArrowLeft, AlertCircle, Lock, User, Sparkles } from 'lucide-react';

export function VolunteerLoginPage({ onNavigate }) {
  const { loginVolunteer } = useAuth();
  const [username, setUsername] = useState('');
  const [passCode, setPassCode] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!username.trim() || !passCode.trim()) {
      setErrorMsg('Please enter both Username and Pass Code.');
      return;
    }

    setIsLoading(true);
    const result = loginVolunteer(username.trim(), passCode.trim());
    setIsLoading(false);

    if (result.success) {
      onNavigate('/volunteer/dashboard');
    } else {
      setErrorMsg(result.error || 'Invalid Volunteer credentials. Please try again.');
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
                background: '#ecfdf5', 
                color: '#059669',
                display: 'inline-flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                marginBottom: '0.75rem'
              }}
            >
              <UserCheck size={26} />
            </div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.25rem' }}>
              Volunteer Login
            </h1>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
              Sign in with your assigned volunteer credentials to scan participant QR codes.
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
              <label className="form-label" htmlFor="volunteerUser">
                Username
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  id="volunteerUser"
                  type="text"
                  className="form-control"
                  placeholder="e.g. volunteer1"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="username"
                  autoFocus
                />
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
              <label className="form-label" htmlFor="volunteerPass">
                Pass Code
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  id="volunteerPass"
                  type="password"
                  className="form-control"
                  placeholder="e.g. vol123"
                  value={passCode}
                  onChange={(e) => setPassCode(e.target.value)}
                  autoComplete="current-password"
                />
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-block btn-lg"
              disabled={isLoading}
            >
              <span>{isLoading ? 'Verifying...' : 'LOGIN'}</span>
            </button>
          </form>

        </div>

      </div>
    </div>
  );
}
