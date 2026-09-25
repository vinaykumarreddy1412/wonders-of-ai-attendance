import React from 'react';

export function Footer({ onNavigate }) {
  return (
    <footer className="footer">
      <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <strong>Euphoria 2026</strong> • Official Attendance Management System
        </div>
        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <span>Powered by React, SheetJS & QR Technology</span>
          {onNavigate && (
            <span style={{ display: 'inline-flex', gap: '0.5rem', opacity: 0.6 }}>
              •
              <a 
                href="#/volunteer/login" 
                onClick={(e) => { e.preventDefault(); onNavigate('/volunteer/login'); }}
                style={{ color: 'inherit', textDecoration: 'underline', fontSize: '0.75rem' }}
              >
                Volunteer Desk
              </a>
              •
              <a 
                href="#/admin/login" 
                onClick={(e) => { e.preventDefault(); onNavigate('/admin/login'); }}
                style={{ color: 'inherit', textDecoration: 'underline', fontSize: '0.75rem' }}
              >
                Admin Portal
              </a>
            </span>
          )}
        </div>
      </div>
    </footer>
  );
}
