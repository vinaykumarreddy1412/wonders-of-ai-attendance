import React from 'react';
import { User, UserCheck, ShieldCheck, Sparkles, CheckCircle2, ArrowRight, QrCode, Camera } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export function HomePage({ onNavigate }) {
  const { student, admin, volunteer } = useAuth();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, padding: '2rem 1rem' }}>
      <div style={{ maxWidth: '980px', width: '100%', textAlign: 'center' }}>
        
        {/* Top Tag */}
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: '#eff6ff', color: '#1d4ed8', padding: '0.4rem 1rem', borderRadius: '9999px', fontSize: '0.85rem', fontWeight: 600, marginBottom: '1.5rem', border: '1px solid #dbeafe' }}>
          <Sparkles size={16} />
          <span>Official Euphoria 2026 Event Attendance System</span>
        </div>

        {/* Main Title */}
        <h1 style={{ fontSize: 'clamp(2.2rem, 5vw, 3.2rem)', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.15, marginBottom: '0.75rem' }}>
          ATTENDANCE PORTAL
        </h1>

        <p style={{ fontSize: '1.1rem', color: 'var(--text-secondary)', marginBottom: '2.5rem', maxWidth: '640px', margin: '0 auto 2.5rem auto' }}>
          Select your portal to access your unique participant QR code, volunteer attendance scanner, or coordinator controls.
        </p>

        {/* Main Action: Single Student Portal */}
        <div style={{ maxWidth: '520px', margin: '0 auto', textAlign: 'left' }}>
          <div 
            className="card card-hover"
            style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              justifyContent: 'space-between',
              cursor: 'pointer',
              border: '2px solid #3b82f6',
              boxShadow: '0 10px 25px -5px rgba(59, 130, 246, 0.15)',
              padding: '2.25rem 2rem',
              borderRadius: '16px'
            }}
            onClick={() => onNavigate(student ? '/student/dashboard' : '/student/login')}
          >
            <div>
              <div 
                style={{ 
                  width: '56px', 
                  height: '56px', 
                  borderRadius: '14px', 
                  background: '#eff6ff', 
                  color: '#2563eb',
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  marginBottom: '1.25rem'
                }}
              >
                <User size={30} />
              </div>
              <h2 style={{ fontSize: '1.6rem', fontWeight: 800, marginBottom: '0.5rem', color: 'var(--text-primary)' }}>
                Student / Delegate Portal
              </h2>
              <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', marginBottom: '1.75rem', lineHeight: '1.5' }}>
                Enter with your <strong>Registration Code</strong> and <strong>Mobile Number</strong> to view your personal profile and display your <strong>Personal Attendance QR Code</strong>.
              </p>
            </div>

            <button 
              type="button"
              className="btn btn-primary btn-block btn-lg"
              style={{ padding: '0.9rem 1.25rem', fontSize: '1rem', fontWeight: 700 }}
            >
              <span>{student ? 'Go to My Dashboard' : 'Student Login'}</span>
              <ArrowRight size={18} />
            </button>
          </div>
        </div>

        {/* Bottom Feature Badges */}
        <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: '1.5rem', marginTop: '3rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <CheckCircle2 size={16} color="#059669" />
            <span>435 Verified Delegates</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <CheckCircle2 size={16} color="#059669" />
            <span>Personal Attendance QR Code</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <CheckCircle2 size={16} color="#059669" />
            <span>Instant Cloud Verification</span>
          </div>
        </div>

      </div>
    </div>
  );
}
