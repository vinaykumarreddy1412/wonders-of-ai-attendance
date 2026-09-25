import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { KeyRound, ArrowLeft, AlertCircle, Sparkles, Hash, Phone, Eye, EyeOff } from 'lucide-react';

export function StudentLoginPage({ onNavigate }) {
  const { loginStudent } = useAuth();
  const [registrationCode, setRegistrationCode] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [showMobile, setShowMobile] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setErrorMsg('');

    const reg = registrationCode.trim();
    const mob = mobileNumber.trim();

    if (!reg || !mob) {
      setErrorMsg('Please enter both your Registration Code and Mobile Number.');
      return;
    }

    setIsLoading(true);
    try {
      const result = loginStudent(reg, mob);
      if (result.success) {
        onNavigate('/student/dashboard');
      } else {
        setErrorMsg(result.error || 'Invalid Registration Code or Mobile Number. Please check your credentials and try again.');
      }
    } catch (err) {
      console.error('Login error:', err);
      setErrorMsg('An error occurred while logging in. Please try again.');
    } finally {
      setIsLoading(false);
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
                background: '#eff6ff', 
                color: '#2563eb',
                display: 'inline-flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                marginBottom: '0.75rem'
              }}
            >
              <KeyRound size={24} />
            </div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.25rem' }}>
              Student / Delegate Login
            </h1>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
              Enter your <strong>Registration Code</strong> and <strong>Mobile Number</strong> to access your personal dashboard.
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
            <div className="form-group" style={{ marginBottom: '1.25rem' }}>
              <label className="form-label" htmlFor="regCodeInput">
                Registration Code
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  id="regCodeInput"
                  type="text"
                  className="form-control"
                  style={{ fontSize: '0.95rem', fontWeight: 600, fontFamily: 'monospace' }}
                  placeholder="e.g. EUPH-26-852995-S1"
                  value={registrationCode}
                  onChange={(e) => setRegistrationCode(e.target.value)}
                  autoComplete="username"
                  autoFocus
                />
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                <label className="form-label" htmlFor="mobileInput" style={{ marginBottom: 0 }}>
                  Mobile Number (Password)
                </label>
                <button
                  type="button"
                  onClick={() => setShowMobile(!showMobile)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-secondary)',
                    cursor: 'pointer',
                    fontSize: '0.75rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '2px 6px',
                    borderRadius: '4px'
                  }}
                >
                  {showMobile ? <EyeOff size={14} /> : <Eye size={14} />}
                  <span>{showMobile ? 'Hide Number' : 'Show Number'}</span>
                </button>
              </div>
              <div style={{ position: 'relative' }}>
                <input
                  id="mobileInput"
                  type={showMobile ? 'text' : 'password'}
                  className="form-control"
                  style={{ fontSize: '0.95rem', letterSpacing: showMobile ? 'normal' : '0.04em', paddingRight: '2.5rem' }}
                  placeholder="e.g. 8438408688"
                  value={mobileNumber}
                  onChange={(e) => setMobileNumber(e.target.value)}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowMobile(!showMobile)}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--text-muted)',
                    display: 'flex',
                    alignItems: 'center',
                    padding: '4px'
                  }}
                  title={showMobile ? 'Hide Mobile Number' : 'Show Mobile Number'}
                >
                  {showMobile ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
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
