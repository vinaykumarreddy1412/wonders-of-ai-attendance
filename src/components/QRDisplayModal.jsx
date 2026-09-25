import React, { useEffect, useState, useRef } from 'react';
import QRCode from 'qrcode';
import { X, Copy, Check, Download, Printer, Radio, Clock, Calendar } from 'lucide-react';
import { evaluateSessionStatus } from '../utils/timeUtils';

export function QRDisplayModal({ session, isOpen, onClose }) {
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const printRef = useRef(null);

  useEffect(() => {
    if (session && session.qrToken) {
      QRCode.toDataURL(session.qrToken, {
        width: 380,
        margin: 2,
        color: {
          dark: '#0f172a',
          light: '#ffffff'
        }
      })
      .then(url => setQrDataUrl(url))
      .catch(err => console.error('Error generating QR:', err));
    }
  }, [session]);

  if (!isOpen || !session) return null;

  const evaluation = evaluateSessionStatus(session);

  const handleCopyToken = () => {
    navigator.clipboard.writeText(session.qrToken);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadQR = () => {
    if (!qrDataUrl) return;
    const a = document.createElement('a');
    a.href = qrDataUrl;
    a.download = `${session.sessionName.replace(/\s+/g, '_')}_QR.png`;
    a.click();
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal-content" 
        onClick={(e) => e.stopPropagation()} 
        style={{ maxWidth: '540px', textAlign: 'center' }}
      >
        <div className="modal-header" style={{ justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span className={`badge ${evaluation.status === 'ACTIVE' ? 'badge-present' : evaluation.status === 'UPCOMING' ? 'badge-upcoming' : 'badge-closed'}`}>
              <Radio size={12} className={evaluation.status === 'ACTIVE' ? 'pulse-anim' : ''} />
              <span>{evaluation.status}</span>
            </span>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Official Euphoria QR Display Format */}
        <div ref={printRef} style={{ padding: '0.5rem 0' }}>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '0.05em', color: '#1e40af', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
            {session.sessionName || 'EUPHORIA 2026'}
          </h2>
          
          <div style={{ display: 'flex', justifyContent: 'center', gap: '1.25rem', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <Calendar size={14} color="#64748b" />
              {session.date}
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <Clock size={14} color="#64748b" />
              {session.startTime} - {session.endTime}
            </span>
          </div>

          {/* LARGE QR CODE */}
          <div 
            style={{
              display: 'inline-block',
              background: '#ffffff',
              padding: '1.25rem',
              borderRadius: '16px',
              boxShadow: '0 8px 30px rgba(0,0,0,0.08)',
              border: '2px solid #e2e8f0',
              margin: '0 auto 1.25rem auto'
            }}
          >
            {qrDataUrl ? (
              <img 
                src={qrDataUrl} 
                alt="Euphoria Attendance QR Code" 
                style={{ width: '280px', height: '280px', display: 'block' }} 
              />
            ) : (
              <div style={{ width: '280px', height: '280px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                Generating QR...
              </div>
            )}
          </div>

          <p style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
            Scan this QR to mark attendance
          </p>

          <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)' }}>
            Students should open their student dashboard and tap "SCAN QR CODE"
          </p>
        </div>

        {/* Token & Actions */}
        <div style={{ marginTop: '1.5rem', paddingTop: '1.25rem', borderTop: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f8fafc', padding: '0.6rem 0.85rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <div style={{ textAlign: 'left', overflow: 'hidden' }}>
              <span style={{ display: 'block', fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Session Token</span>
              <code style={{ fontSize: '0.775rem', color: 'var(--text-primary)', fontFamily: 'monospace', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', display: 'block' }}>
                {session.qrToken}
              </code>
            </div>
            <button 
              type="button" 
              className="btn btn-secondary btn-sm"
              onClick={handleCopyToken}
              style={{ flexShrink: 0 }}
            >
              {copied ? <Check size={14} color="#059669" /> : <Copy size={14} />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
            <button 
              type="button" 
              className="btn btn-secondary btn-sm"
              onClick={handleDownloadQR}
            >
              <Download size={14} />
              <span>Download Image</span>
            </button>
            <button 
              type="button" 
              className="btn btn-secondary btn-sm"
              onClick={handlePrint}
            >
              <Printer size={14} />
              <span>Print Poster</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
