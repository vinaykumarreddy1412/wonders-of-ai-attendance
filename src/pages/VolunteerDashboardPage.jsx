import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { recordAttendanceByVolunteer, subscribeToDB, getAllAttendanceRecords } from '../services/db';
import { Html5Qrcode } from 'html5-qrcode';
import confetti from 'canvas-confetti';
import { 
  UserCheck, 
  QrCode, 
  Camera, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  RefreshCw, 
  KeyRound, 
  X,
  History,
  ShieldCheck,
  Sparkles,
  ArrowRight
} from 'lucide-react';

export function VolunteerDashboardPage({ onNavigate }) {
  const { volunteer, logoutVolunteer } = useAuth();
  
  // Scanner states
  const [isScanning, setIsScanning] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [manualCode, setManualCode] = useState('');
  const [showManualInput, setShowManualInput] = useState(false);

  // Scan Result Modal / Toast
  const [scanResult, setScanResult] = useState(null); // { success, isDuplicate, isInvalid, title, message, student, time, date, scannedBy, originalTime }
  const [recentScans, setRecentScans] = useState([]);
  
  const html5QrCodeRef = useRef(null);
  const isProcessingRef = useRef(false);
  const autoResumeTimerRef = useRef(null);

  useEffect(() => {
    if (!volunteer) {
      onNavigate('/volunteer/login');
      return;
    }

    const refreshData = () => {
      const records = getAllAttendanceRecords();
      // Filter records scanned by this volunteer
      const myScans = records.filter(r => r.scannedBy === volunteer.name);
      setRecentScans(myScans.slice(0, 10));
    };

    refreshData();
    const unsubscribe = subscribeToDB(() => refreshData());
    return () => {
      unsubscribe();
      stopScanner();
      if (autoResumeTimerRef.current) clearTimeout(autoResumeTimerRef.current);
    };
  }, [volunteer, onNavigate]);

  if (!volunteer) return null;

  const startScanner = async () => {
    setCameraError('');
    setIsScanning(true);
    isProcessingRef.current = false;

    // Small delay to ensure DOM is ready
    await new Promise(r => setTimeout(r, 200));

    const element = document.getElementById('volunteer-camera-view');
    if (!element) return;

    try {
      if (html5QrCodeRef.current) {
        try {
          await html5QrCodeRef.current.stop();
        } catch {
          // ignore
        }
      }

      const scanner = new Html5Qrcode('volunteer-camera-view');
      html5QrCodeRef.current = scanner;

      const qrCodeSuccessCallback = (decodedText) => {
        if (isProcessingRef.current) return;
        isProcessingRef.current = true;
        handleProcessScan(decodedText);
      };

      const qrConfig = {
        fps: 15,
        qrbox: { width: 260, height: 260 },
        aspectRatio: 1.0
      };

      // Prioritize rear environment camera on mobile
      await scanner.start(
        { facingMode: 'environment' },
        qrConfig,
        qrCodeSuccessCallback,
        () => {} // Frame error ignore
      );
    } catch (err) {
      console.warn('Volunteer camera start error:', err);
      setIsScanning(false);
      if (err?.name === 'NotAllowedError' || String(err).includes('Permission')) {
        setCameraError('Camera access is required to scan the attendance QR code.');
      } else {
        setCameraError('Camera access is required to scan the attendance QR code. (Camera unavailable or permission denied)');
      }
      setShowManualInput(true);
    }
  };

  const stopScanner = async () => {
    if (html5QrCodeRef.current) {
      try {
        if (html5QrCodeRef.current.isScanning) {
          await html5QrCodeRef.current.stop();
        }
        html5QrCodeRef.current.clear();
      } catch (e) {
        console.warn('Scanner stop error:', e);
      }
      html5QrCodeRef.current = null;
    }
    setIsScanning(false);
  };

  const handleProcessScan = (rawPayload) => {
    const res = recordAttendanceByVolunteer({
      qrPayload: rawPayload,
      volunteerName: volunteer.name
    });

    if (res.success) {
      try {
        confetti({ particleCount: 50, spread: 60, origin: { y: 0.7 } });
      } catch {}

      setScanResult({
        success: true,
        title: '✓ ATTENDANCE MARKED',
        student: res.student,
        time: res.time,
        date: res.date,
        scannedBy: res.scannedBy
      });

      // Auto-resume scanning after 2.5 seconds for continuous scanning workflow
      if (autoResumeTimerRef.current) clearTimeout(autoResumeTimerRef.current);
      autoResumeTimerRef.current = setTimeout(() => {
        setScanResult(null);
        isProcessingRef.current = false;
      }, 2500);

    } else if (res.isDuplicate) {
      setScanResult({
        success: false,
        isDuplicate: true,
        title: 'ATTENDANCE ALREADY MARKED',
        student: res.student,
        originalTime: res.originalTime
      });

      if (autoResumeTimerRef.current) clearTimeout(autoResumeTimerRef.current);
      autoResumeTimerRef.current = setTimeout(() => {
        setScanResult(null);
        isProcessingRef.current = false;
      }, 3000);

    } else {
      setScanResult({
        success: false,
        isInvalid: true,
        title: 'INVALID QR CODE',
        message: 'This participant is not registered.'
      });

      if (autoResumeTimerRef.current) clearTimeout(autoResumeTimerRef.current);
      autoResumeTimerRef.current = setTimeout(() => {
        setScanResult(null);
        isProcessingRef.current = false;
      }, 3000);
    }
  };

  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    handleProcessScan(manualCode.trim());
    setManualCode('');
  };

  const dismissResultAndContinue = () => {
    if (autoResumeTimerRef.current) clearTimeout(autoResumeTimerRef.current);
    setScanResult(null);
    isProcessingRef.current = false;
  };

  return (
    <div className="page-wrapper" style={{ maxWidth: '680px' }}>
      
      {/* Header Info */}
      <div 
        className="card"
        style={{ 
          marginBottom: '1.25rem',
          padding: '1.25rem 1.5rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '0.75rem',
          background: 'linear-gradient(135deg, #ffffff 0%, #f0fdf4 100%)',
          border: '1px solid #bbf7d0'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div 
            style={{ 
              width: '42px', 
              height: '42px', 
              borderRadius: '10px', 
              background: '#059669', 
              color: '#ffffff',
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              boxShadow: '0 2px 8px rgba(5, 150, 105, 0.3)'
            }}
          >
            <UserCheck size={22} />
          </div>
          <div>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#047857', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              ACTIVE VOLUNTEER DESK
            </span>
            <h1 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              {volunteer.name}
            </h1>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span className="badge badge-present" style={{ fontSize: '0.8rem' }}>
            {recentScans.length} Scanned Today
          </span>
        </div>
      </div>

      {/* Camera Scanning Card */}
      <div className="card" style={{ padding: '1.75rem', marginBottom: '1.5rem', textAlign: 'center' }}>
        
        {!isScanning ? (
          <div>
            <div 
              style={{ 
                width: '72px', 
                height: '72px', 
                borderRadius: '20px', 
                background: '#eff6ff', 
                color: '#2563eb',
                display: 'inline-flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                marginBottom: '1rem',
                boxShadow: '0 4px 16px rgba(37, 99, 235, 0.15)'
              }}
            >
              <QrCode size={40} />
            </div>

            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '0.4rem' }}>
              Volunteer Scanner
            </h2>
            
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', maxWidth: '440px', margin: '0 auto 1.5rem auto' }}>
              Tap below to activate your camera and continuously scan delegate QR codes.
            </p>

            <button
              type="button"
              className="btn btn-primary btn-lg pulse-anim"
              onClick={startScanner}
              style={{ padding: '1rem 2.5rem', fontSize: '1.15rem', fontWeight: 700, borderRadius: '12px' }}
            >
              <Camera size={22} />
              <span>SCAN PARTICIPANT QR</span>
            </button>

            {cameraError && (
              <div className="alert alert-error" style={{ marginTop: '1.25rem', textAlign: 'left' }}>
                <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
                <div>{cameraError}</div>
              </div>
            )}
          </div>
        ) : (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#059669', fontWeight: 700, fontSize: '0.85rem' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', display: 'inline-block' }} className="pulse-anim"></span>
                <span>Camera Live (Rear Camera)</span>
              </div>

              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={stopScanner}
              >
                <X size={14} />
                <span>Stop Scanner</span>
              </button>
            </div>

            {/* Video Box */}
            <div 
              style={{ 
                position: 'relative', 
                background: '#0f172a', 
                borderRadius: '16px', 
                overflow: 'hidden', 
                minHeight: '280px',
                border: '3px solid #3b82f6',
                boxShadow: '0 8px 24px rgba(0,0,0,0.15)'
              }}
            >
              <div id="volunteer-camera-view" style={{ width: '100%', height: '100%' }}></div>
            </div>

            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.75rem' }}>
              Align participant's phone QR inside the square frame. Scanning is continuous.
            </p>
          </div>
        )}

        {/* Manual Fallback Option */}
        <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => setShowManualInput(!showManualInput)}
            style={{ fontSize: '0.8rem' }}
          >
            <KeyRound size={13} />
            <span>{showManualInput ? 'Hide Manual Entry' : 'Manual Registration Code / Test Entry'}</span>
          </button>

          {showManualInput && (
            <form onSubmit={handleManualSubmit} style={{ marginTop: '0.75rem', background: '#f8fafc', padding: '1rem', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
              <label style={{ fontSize: '0.825rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.4rem', textAlign: 'left' }}>
                Enter Registration Code or QR payload:
              </label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. EUPH-26-852995-S1"
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  style={{ fontSize: '0.9rem' }}
                />
                <button type="submit" className="btn btn-primary btn-sm">
                  Record
                </button>
              </div>
              <div style={{ display: 'flex', gap: '0.35rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.725rem', color: 'var(--text-muted)' }}>Quick test:</span>
                <button
                  type="button"
                  onClick={() => handleProcessScan('EUPH-26-852995-S1')}
                  style={{ background: 'none', border: 'none', color: '#2563eb', fontSize: '0.725rem', cursor: 'pointer', textDecoration: 'underline' }}
                >
                  Saranya (EUPH-26-852995-S1)
                </button>
                <button
                  type="button"
                  onClick={() => handleProcessScan('EUPH-26-FDF507-S1')}
                  style={{ background: 'none', border: 'none', color: '#2563eb', fontSize: '0.725rem', cursor: 'pointer', textDecoration: 'underline' }}
                >
                  Lalithambigai (EUPH-26-FDF507-S1)
                </button>
              </div>
            </form>
          )}
        </div>

      </div>

      {/* Recent Scans by this Volunteer */}
      <div className="card">
        <div className="card-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <History size={18} color="#059669" />
            <h2 className="card-title" style={{ fontSize: '1.15rem' }}>My Recent Scans</h2>
          </div>
          <span className="badge badge-active" style={{ fontSize: '0.75rem' }}>
            {recentScans.length} Delegates
          </span>
        </div>

        {recentScans.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            No scans recorded during this session yet.
          </div>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Participant</th>
                  <th>Reg Code</th>
                  <th>Status</th>
                  <th>Time</th>
                </tr>
              </thead>
              <tbody>
                {recentScans.map((rec) => (
                  <tr key={rec.attendanceId}>
                    <td style={{ fontWeight: 600 }}>{rec.delegateFullName}</td>
                    <td style={{ fontFamily: 'monospace', fontSize: '0.825rem' }}>{rec.registrationCode}</td>
                    <td>
                      <span className="badge badge-present">PRESENT</span>
                    </td>
                    <td style={{ fontSize: '0.825rem', color: 'var(--text-secondary)' }}>{rec.time}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* SCAN RESULT OVERLAY MODAL */}
      {scanResult && (
        <div className="modal-overlay" onClick={dismissResultAndContinue}>
          <div 
            className="modal-content" 
            onClick={(e) => e.stopPropagation()} 
            style={{ maxWidth: '440px', textAlign: 'center', animation: 'slideUp 0.2s ease-out' }}
          >
            {/* SUCCESS */}
            {scanResult.success && (
              <div>
                <div 
                  style={{ 
                    width: '64px', 
                    height: '64px', 
                    borderRadius: '50%', 
                    background: '#ecfdf5', 
                    color: '#059669', 
                    display: 'inline-flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    marginBottom: '1rem',
                    boxShadow: '0 4px 16px rgba(5, 150, 105, 0.25)'
                  }}
                >
                  <CheckCircle2 size={38} />
                </div>

                <h2 style={{ fontSize: '1.45rem', fontWeight: 800, color: '#065f46', marginBottom: '1rem' }}>
                  {scanResult.title}
                </h2>

                <div 
                  style={{ 
                    background: '#f8fafc', 
                    border: '1px solid #e2e8f0', 
                    borderRadius: '12px', 
                    padding: '1.25rem', 
                    textAlign: 'left',
                    marginBottom: '1.25rem',
                    fontSize: '0.9rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.45rem'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #edf2f7', paddingBottom: '0.3rem' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Name:</span>
                    <span style={{ fontWeight: 700 }}>{scanResult.student?.delegateFullName}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #edf2f7', paddingBottom: '0.3rem' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Registration Code:</span>
                    <span style={{ fontWeight: 700, fontFamily: 'monospace' }}>{scanResult.student?.registrationCode}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #edf2f7', paddingBottom: '0.3rem' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Status:</span>
                    <span className="badge badge-present">PRESENT</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #edf2f7', paddingBottom: '0.3rem' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Time:</span>
                    <span>{scanResult.time}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '0.2rem' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Scanned By:</span>
                    <span style={{ fontWeight: 600, color: '#047857' }}>{scanResult.scannedBy}</span>
                  </div>
                </div>

                <button 
                  type="button" 
                  className="btn btn-primary btn-block"
                  onClick={dismissResultAndContinue}
                >
                  <span>Scan Next Participant</span>
                  <ArrowRight size={16} />
                </button>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                  Resuming scanner automatically in 2 seconds...
                </p>
              </div>
            )}

            {/* DUPLICATE */}
            {scanResult.isDuplicate && (
              <div>
                <div 
                  style={{ 
                    width: '64px', 
                    height: '64px', 
                    borderRadius: '50%', 
                    background: '#fefce8', 
                    color: '#a16207', 
                    display: 'inline-flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    marginBottom: '1rem'
                  }}
                >
                  <AlertCircle size={38} />
                </div>

                <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#854d0e', marginBottom: '1rem' }}>
                  {scanResult.title}
                </h2>

                <div 
                  style={{ 
                    background: '#fefce8', 
                    border: '1px solid #fef08a', 
                    borderRadius: '12px', 
                    padding: '1.25rem', 
                    textAlign: 'left',
                    marginBottom: '1.25rem',
                    fontSize: '0.9rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.45rem'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #fef9c3', paddingBottom: '0.3rem' }}>
                    <span style={{ color: '#713f12' }}>Name:</span>
                    <span style={{ fontWeight: 700 }}>{scanResult.student?.delegateFullName}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #fef9c3', paddingBottom: '0.3rem' }}>
                    <span style={{ color: '#713f12' }}>Status:</span>
                    <span className="badge badge-present">PRESENT</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '0.2rem' }}>
                    <span style={{ color: '#713f12' }}>Time:</span>
                    <span>{scanResult.originalTime}</span>
                  </div>
                </div>

                <button 
                  type="button" 
                  className="btn btn-secondary btn-block"
                  onClick={dismissResultAndContinue}
                >
                  <span>Continue Scanning</span>
                  <ArrowRight size={16} />
                </button>
              </div>
            )}

            {/* INVALID QR */}
            {scanResult.isInvalid && (
              <div>
                <div 
                  style={{ 
                    width: '64px', 
                    height: '64px', 
                    borderRadius: '50%', 
                    background: '#fef2f2', 
                    color: '#dc2626', 
                    display: 'inline-flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    marginBottom: '1rem'
                  }}
                >
                  <AlertCircle size={38} />
                </div>

                <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#991b1b', marginBottom: '0.5rem' }}>
                  {scanResult.title}
                </h2>

                <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
                  {scanResult.message}
                </p>

                <button 
                  type="button" 
                  className="btn btn-secondary btn-block"
                  onClick={dismissResultAndContinue}
                >
                  <span>Continue Scanning</span>
                </button>
              </div>
            )}

          </div>
        </div>
      )}

    </div>
  );
}
