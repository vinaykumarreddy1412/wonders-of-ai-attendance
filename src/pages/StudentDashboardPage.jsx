import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  getStudentAttendanceHistory, 
  getParticipantQRPayload,
  subscribeToDB 
} from '../services/db';
import QRCode from 'qrcode';
import { 
  Building2, 
  Phone, 
  Hash, 
  QrCode, 
  CheckCircle2, 
  Clock, 
  Calendar, 
  AlertCircle,
  History,
  Download,
  ShieldCheck,
  UserCheck
} from 'lucide-react';

export function StudentDashboardPage({ onNavigate }) {
  const { student } = useAuth();
  const [history, setHistory] = useState([]);
  const [participantQrUrl, setParticipantQrUrl] = useState('');

  useEffect(() => {
    if (!student) {
      onNavigate('/student/login');
      return;
    }

    const loadData = () => {
      const records = getStudentAttendanceHistory(student.registrationCode);
      setHistory(records);
    };

    loadData();

    // Generate Participant Unique QR Code
    const payload = getParticipantQRPayload(student);
    if (payload) {
      QRCode.toDataURL(payload, {
        width: 320,
        margin: 2,
        color: {
          dark: '#0f172a',
          light: '#ffffff'
        }
      })
      .then(url => setParticipantQrUrl(url))
      .catch(err => console.error('Error generating student QR:', err));
    }

    const unsubscribe = subscribeToDB(() => loadData());
    return unsubscribe;
  }, [student, onNavigate]);

  if (!student) return null;

  const isPresent = student.attendance === 'PRESENT';

  const handleDownloadQR = () => {
    if (!participantQrUrl) return;
    const a = document.createElement('a');
    a.href = participantQrUrl;
    a.download = `Euphoria_QR_${student.registrationCode}.png`;
    a.click();
  };

  return (
    <div className="page-wrapper" style={{ maxWidth: '850px' }}>
      
      {/* Welcome Banner Card */}
      <div 
        className="card" 
        style={{ 
          background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
          border: '1px solid #e2e8f0',
          marginBottom: '1.5rem',
          padding: '1.75rem'
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--primary-600)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                PARTICIPANT / STUDENT PORTAL
              </span>
              <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginTop: '0.2rem', color: 'var(--text-primary)' }}>
                Welcome, {student.delegateFullName}
              </h1>
            </div>

            {/* Attendance Status Badge */}
            <div style={{ textAlign: 'right' }}>
              <span style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
                Attendance Status
              </span>
              <span 
                className={`badge ${isPresent ? 'badge-present' : 'badge-notmarked'}`}
                style={{ fontSize: '0.9rem', padding: '0.45rem 1rem' }}
              >
                {isPresent ? <CheckCircle2 size={16} /> : <Clock size={16} />}
                <span>{student.attendance || 'NOT MARKED'}</span>
              </span>
            </div>
          </div>

          {/* Student Information Grid */}
          <div 
            style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
              gap: '1rem',
              background: '#f8fafc',
              padding: '1.25rem',
              borderRadius: '12px',
              border: '1px solid #e2e8f0',
              marginTop: '0.5rem'
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.2rem' }}>
                <Hash size={13} />
                <span>Registration Code</span>
              </div>
              <p style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)', fontFamily: 'monospace' }}>
                {student.registrationCode}
              </p>
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.2rem' }}>
                <Building2 size={13} />
                <span>College / Institution</span>
              </div>
              <p style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                {student.college || 'Euphoria Participant'}
              </p>
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.2rem' }}>
                <Phone size={13} />
                <span>Mobile Number</span>
              </div>
              <p style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                {student.mobileNumber || '-'}
              </p>
            </div>
          </div>

        </div>
      </div>

      {/* NEW: Participant Unique QR Code Section */}
      <div 
        className="card" 
        style={{ 
          textAlign: 'center', 
          padding: '2.25rem 1.5rem', 
          marginBottom: '1.75rem',
          border: '2px solid #bfdbfe',
          background: '#ffffff'
        }}
      >
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', background: '#eff6ff', color: '#1d4ed8', padding: '0.35rem 0.85rem', borderRadius: '9999px', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.75rem' }}>
          <QrCode size={14} />
          <span>Participant Identification</span>
        </div>

        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.35rem', color: 'var(--text-primary)' }}>
          My QR Code
        </h2>
        
        <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', maxWidth: '460px', margin: '0 auto 1.5rem auto' }}>
          Show this unique QR code on your mobile device to an official <strong>Euphoria Volunteer</strong> to record your attendance.
        </p>

        {/* UNIQUE QR CODE */}
        <div 
          style={{
            display: 'inline-block',
            background: '#ffffff',
            padding: '1.25rem',
            borderRadius: '16px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.06)',
            border: '2px solid #e2e8f0',
            margin: '0 auto 1.25rem auto'
          }}
        >
          {participantQrUrl ? (
            <img 
              src={participantQrUrl} 
              alt="Participant Unique Attendance QR Code" 
              style={{ width: '220px', height: '220px', display: 'block' }} 
            />
          ) : (
            <div style={{ width: '220px', height: '220px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              Generating Your QR Code...
            </div>
          )}
        </div>

        {/* Participant Details Under QR */}
        <div style={{ maxWidth: '360px', margin: '0 auto 1.25rem auto', background: '#f8fafc', padding: '0.85rem 1.25rem', borderRadius: '10px', border: '1px solid #e2e8f0', textAlign: 'left', fontSize: '0.875rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
            <span style={{ color: 'var(--text-muted)' }}>Registration Code:</span>
            <span style={{ fontWeight: 700, fontFamily: 'monospace', color: 'var(--text-primary)' }}>{student.registrationCode}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--text-muted)' }}>Name:</span>
            <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{student.delegateFullName}</span>
          </div>
        </div>

        <div>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={handleDownloadQR}
          >
            <Download size={14} />
            <span>Save / Download QR</span>
          </button>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.4rem', marginTop: '1rem', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
          <ShieldCheck size={14} color="#059669" />
          <span>Secure personal QR linked to your participant account</span>
        </div>
      </div>

      {/* Attendance History */}
      <div className="card">
        <div className="card-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <History size={20} color="#2563eb" />
            <h2 className="card-title" style={{ fontSize: '1.2rem' }}>Attendance History</h2>
          </div>
          <span className="badge badge-active" style={{ fontSize: '0.75rem' }}>
            {history.length} Record{history.length !== 1 ? 's' : ''}
          </span>
        </div>

        {history.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-muted)' }}>
            <Clock size={36} style={{ margin: '0 auto 0.5rem auto', opacity: 0.5 }} />
            <p style={{ fontWeight: 600 }}>No attendance records recorded yet</p>
            <p style={{ fontSize: '0.825rem', marginTop: '0.25rem' }}>
              Present your QR code above to a Volunteer at the event venue to mark attendance.
            </p>
          </div>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Session</th>
                  <th>Status</th>
                  <th>Time</th>
                  <th>Scanned By</th>
                </tr>
              </thead>
              <tbody>
                {history.map((rec) => (
                  <tr key={rec.attendanceId}>
                    <td style={{ fontWeight: 600 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <Calendar size={13} color="#64748b" />
                        <span>{rec.date}</span>
                      </div>
                    </td>
                    <td>
                      <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                        {rec.sessionName}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${rec.status === 'PRESENT' ? 'badge-present' : 'badge-absent'}`}>
                        {rec.status === 'PRESENT' ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />}
                        <span>{rec.status}</span>
                      </span>
                    </td>
                    <td style={{ color: 'var(--text-secondary)', fontSize: '0.825rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <Clock size={13} color="#64748b" />
                        <span>{rec.time}</span>
                      </div>
                    </td>
                    <td style={{ fontSize: '0.825rem', color: 'var(--text-secondary)' }}>
                      <span className="badge badge-active" style={{ fontSize: '0.725rem' }}>
                        <UserCheck size={11} />
                        <span>{rec.scannedBy || 'Volunteer'}</span>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
