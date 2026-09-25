import React from 'react';
import { useAuth } from '../context/AuthContext';
import { QrCode, LogOut, ShieldCheck, UserCheck, CheckCircle2, Camera } from 'lucide-react';

export function Navbar({ activeRoute, onNavigate }) {
  const { student, admin, volunteer, logoutStudent, logoutAdmin, logoutVolunteer } = useAuth();

  return (
    <header className="navbar">
      <div className="navbar-inner">
        <div 
          className="brand-logo" 
          onClick={() => onNavigate('/')} 
          style={{ cursor: 'pointer' }}
        >
          <div className="brand-icon-box">
            <QrCode size={22} strokeWidth={2.5} />
          </div>
          <div className="brand-text">
            <span className="brand-title">EUPHORIA 2026</span>
            <span className="brand-subtitle">Attendance Portal</span>
          </div>
        </div>

        <div className="nav-actions">
          {/* Student Session */}
          {student && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span className="badge badge-active" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <UserCheck size={13} />
                  <span>{student.delegateFullName.split(' ')[0]}</span>
                </span>
                {student.attendance === 'PRESENT' && (
                  <span className="badge badge-present" title="Status: Present">
                    <CheckCircle2 size={12} />
                    <span>PRESENT</span>
                  </span>
                )}
              </div>
              <button 
                className="btn btn-secondary btn-sm"
                onClick={() => {
                  logoutStudent();
                  onNavigate('/');
                }}
                title="Logout Student"
              >
                <LogOut size={14} />
                <span>Logout</span>
              </button>
            </div>
          )}

          {/* Volunteer Session */}
          {volunteer && !student && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <span className="badge badge-present" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Camera size={13} />
                <span>{volunteer.name}</span>
              </span>
              <button 
                className="btn btn-secondary btn-sm"
                onClick={() => {
                  logoutVolunteer();
                  onNavigate('/');
                }}
                title="Logout Volunteer"
              >
                <LogOut size={14} />
                <span>Logout</span>
              </button>
            </div>
          )}

          {/* Admin Session */}
          {admin && !student && !volunteer && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <span className="badge badge-active" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <ShieldCheck size={14} />
                <span>Admin</span>
              </span>
              <button 
                className="btn btn-secondary btn-sm"
                onClick={() => {
                  logoutAdmin();
                  onNavigate('/');
                }}
                title="Logout Admin"
              >
                <LogOut size={14} />
                <span>Logout</span>
              </button>
            </div>
          )}

          {/* Guest Nav */}
          {!student && !admin && !volunteer && (
            <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
              {activeRoute !== '/student/login' && (
                <button 
                  className="btn btn-primary btn-sm"
                  onClick={() => onNavigate('/student/login')}
                >
                  Student Login
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
