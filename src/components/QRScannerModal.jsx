import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { X, Camera, AlertCircle, RefreshCw, KeyRound } from 'lucide-react';

export function QRScannerModal({ isOpen, onClose, onScanSuccess }) {
  const [errorMsg, setErrorMsg] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [manualToken, setManualToken] = useState('');
  const [showManualInput, setShowManualInput] = useState(false);
  const html5QrCodeRef = useRef(null);
  const isStoppingRef = useRef(false);

  useEffect(() => {
    if (!isOpen) {
      stopScanner();
      return;
    }

    // Start scanner when opened
    startScanner();

    return () => {
      stopScanner();
    };
  }, [isOpen]);

  const startScanner = async () => {
    setErrorMsg('');
    setIsScanning(true);
    isStoppingRef.current = false;

    // Small delay to ensure modal DOM is mounted
    await new Promise(r => setTimeout(r, 200));

    const element = document.getElementById('qr-reader-container');
    if (!element) return;

    try {
      if (html5QrCodeRef.current) {
        try {
          await html5QrCodeRef.current.stop();
        } catch {
          // ignore
        }
      }

      const scanner = new Html5Qrcode('qr-reader-container');
      html5QrCodeRef.current = scanner;

      const qrCodeSuccessCallback = (decodedText, decodedResult) => {
        if (isStoppingRef.current) return;
        isStoppingRef.current = true;
        stopScanner();
        if (onScanSuccess) {
          onScanSuccess(decodedText);
        }
      };

      const qrConfig = {
        fps: 15,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0
      };

      await scanner.start(
        { facingMode: 'environment' },
        qrConfig,
        qrCodeSuccessCallback,
        (errorMessage) => {
          // Normal frame-by-frame non-match, no need to show alert
        }
      );
    } catch (err) {
      console.warn('Camera scanner start error:', err);
      setIsScanning(false);
      if (err?.name === 'NotAllowedError' || String(err).includes('Permission')) {
        setErrorMsg('Camera access is required to scan the attendance QR code. Please allow camera permissions in your browser settings.');
      } else {
        setErrorMsg('Camera access is required to scan the attendance QR code. (Camera unavailable or permission denied)');
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

  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (!manualToken.trim()) return;
    stopScanner();
    onScanSuccess(manualToken.trim());
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '480px' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Camera size={20} color="#2563eb" />
            <h3 className="modal-title" style={{ fontSize: '1.15rem' }}>Scan Attendance QR</h3>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {errorMsg && (
          <div className="alert alert-error" style={{ marginBottom: '1rem' }}>
            <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <p style={{ fontWeight: 600 }}>Camera Notice</p>
              <p style={{ fontSize: '0.825rem', marginTop: '2px' }}>{errorMsg}</p>
            </div>
          </div>
        )}

        <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            Point your camera at the official Euphoria session QR code displayed on the screen.
          </p>
        </div>

        {/* Video stream container */}
        <div 
          style={{
            position: 'relative',
            background: '#0f172a',
            borderRadius: '12px',
            overflow: 'hidden',
            minHeight: '260px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '2px solid #3b82f6'
          }}
        >
          <div id="qr-reader-container" style={{ width: '100%', height: '100%' }}></div>
        </div>

        {/* Action / Alternative switch */}
        <div style={{ marginTop: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => {
                setShowManualInput(!showManualInput);
              }}
              style={{ fontSize: '0.8rem' }}
            >
              <KeyRound size={13} />
              {showManualInput ? 'Hide Code Entry' : 'Manual Code / Token Entry'}
            </button>

            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={startScanner}
              style={{ fontSize: '0.8rem' }}
            >
              <RefreshCw size={13} />
              Restart Camera
            </button>
          </div>

          {showManualInput && (
            <form onSubmit={handleManualSubmit} style={{ marginTop: '0.5rem', background: '#f8fafc', padding: '0.75rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.35rem' }}>
                Enter Session QR Token:
              </label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  type="text"
                  className="form-control"
                  style={{ padding: '0.5rem 0.75rem', fontSize: '0.85rem' }}
                  placeholder="e.g. EUPHORIA2026_MAIN_..."
                  value={manualToken}
                  onChange={(e) => setManualToken(e.target.value)}
                  autoFocus
                />
                <button type="submit" className="btn btn-primary btn-sm">
                  Verify
                </button>
              </div>
            </form>
          )}

          <button 
            type="button" 
            className="btn btn-secondary btn-block"
            onClick={onClose}
            style={{ marginTop: '0.5rem' }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
