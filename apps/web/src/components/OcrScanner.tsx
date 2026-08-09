import React, { useState, useRef } from 'react';
import { Upload, FileImage, ShieldCheck, AlertTriangle, FileText, Loader2, XCircle, Eye, EyeOff, ScanLine } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_URL || '';

interface RedactedEntity {
  type: string;
  placeholder: string;
  originalValue: string;
}

interface OcrScanResult {
  success: boolean;
  documentMetadata: {
    fileName: string;
    mimeType: string;
    ocrConfidence: number;
    processedAt: string;
  };
  content: {
    rawExtractedText: string;
    sanitizedText: string;
    tokenMap: Record<string, string>;
    redactedEntities: RedactedEntity[];
  };
  privacyShieldMeta: {
    intercepted: boolean;
    actionTaken: string;
    activeProfile: string;
    riskLevel: string;
    riskScore: number;
    piiTypesDetected: string[];
    tokensRedacted: number;
    ocrLatencyMs: number;
  };
}

interface OcrErrorResult {
  error: {
    message: string;
    type: string;
    code: string;
  };
  privacyShieldMeta?: {
    intercepted: boolean;
    actionTaken: string;
    activeProfile: string;
    riskLevel?: string;
    riskScore?: number;
    reasons?: string[];
    piiTypesDetected?: string[];
    tokensRedacted?: number;
    ocrLatencyMs?: number;
    matchedCustomKeywords?: string[];
  };
}

export const OcrScanner: React.FC = () => {
  const [scanResult, setScanResult] = useState<OcrScanResult | null>(null);
  const [errorResult, setErrorResult] = useState<OcrErrorResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [showRaw, setShowRaw] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (file: File | null) => {
    setSelectedFile(file);
    setScanResult(null);
    setErrorResult(null);
    if (file) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    } else {
      setPreviewUrl(null);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = () => {
    setDragActive(false);
  };

  const handleScan = async () => {
    if (!selectedFile) return;
    setIsLoading(true);
    setScanResult(null);
    setErrorResult(null);

    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      const res = await fetch(`${API_BASE_URL}/api/ocr/scan`, {
        method: 'POST',
        body: formData
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setScanResult(data as OcrScanResult);
      } else {
        setErrorResult(data as OcrErrorResult);
      }
    } catch (err: any) {
      setErrorResult({
        error: {
          message: err.message || 'Network error connecting to OCR endpoint.',
          type: 'network_error',
          code: 'connection_failed'
        }
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    setScanResult(null);
    setErrorResult(null);
    setPreviewUrl(null);
    setShowRaw(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const getRiskBadgeStyle = (riskLevel: string) => {
    switch (riskLevel) {
      case 'CRITICAL': return { background: 'rgba(239, 68, 68, 0.15)', color: '#fca5a5', border: '1px solid rgba(239, 68, 68, 0.4)' };
      case 'HIGH': return { background: 'rgba(245, 158, 11, 0.15)', color: '#fcd34d', border: '1px solid rgba(245, 158, 11, 0.4)' };
      default: return { background: 'rgba(34, 197, 94, 0.15)', color: '#86efac', border: '1px solid rgba(34, 197, 94, 0.4)' };
    }
  };

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '24px' }}>
        <div style={{
          width: '42px', height: '42px', borderRadius: '10px',
          background: 'linear-gradient(135deg, #8b5cf6 0%, #06b6d4 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 0 20px rgba(139, 92, 246, 0.4)'
        }}>
          <ScanLine style={{ width: '22px', height: '22px', color: '#fff' }} />
        </div>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            OCR Document Scanner
          </h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Upload images or documents • Tesseract.js OCR → PII Engine → Structured Safe JSON
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        {/* Left Column: Upload Zone */}
        <div className="glass-panel" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <FileImage style={{ width: '16px', height: '16px', color: '#a5b4fc' }} />
            <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)' }}>Document Upload</span>
          </div>

          {/* Drag & Drop Zone */}
          <div
            onClick={() => fileInputRef.current?.click()}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            style={{
              border: `2px dashed ${dragActive ? '#6366f1' : 'var(--border-color)'}`,
              borderRadius: '12px',
              padding: '40px 24px',
              textAlign: 'center',
              cursor: 'pointer',
              background: dragActive ? 'rgba(99, 102, 241, 0.08)' : 'rgba(0, 0, 0, 0.2)',
              transition: 'all 0.2s ease',
              marginBottom: '16px'
            }}
          >
            <Upload style={{ width: '36px', height: '36px', color: dragActive ? '#6366f1' : 'var(--text-muted)', margin: '0 auto 12px', display: 'block' }} />
            <p style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '6px' }}>
              {dragActive ? 'Drop file here' : 'Click or drag to upload'}
            </p>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              PNG, JPEG, TIFF, BMP • Max 10MB
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/tiff,image/bmp,application/pdf"
              style={{ display: 'none' }}
              onChange={(e) => handleFileChange(e.target.files?.[0] || null)}
            />
          </div>

          {/* File Preview */}
          {selectedFile && (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '10px 14px', background: 'rgba(99, 102, 241, 0.08)',
              borderRadius: '8px', border: '1px solid rgba(99, 102, 241, 0.2)',
              marginBottom: '16px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <FileText style={{ width: '16px', height: '16px', color: '#a5b4fc' }} />
                <div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>{selectedFile.name}</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{(selectedFile.size / 1024).toFixed(1)} KB • {selectedFile.type}</div>
                </div>
              </div>
              <button onClick={handleReset} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '4px' }}>
                <XCircle style={{ width: '16px', height: '16px' }} />
              </button>
            </div>
          )}

          {/* Image Preview */}
          {previewUrl && selectedFile?.type.startsWith('image/') && (
            <div style={{
              marginBottom: '16px', borderRadius: '8px', overflow: 'hidden',
              border: '1px solid var(--border-color)', maxHeight: '260px'
            }}>
              <img src={previewUrl} alt="Preview" style={{ width: '100%', height: 'auto', maxHeight: '260px', objectFit: 'contain', display: 'block', background: '#0a0a1a' }} />
            </div>
          )}

          {/* Scan Button */}
          <button
            onClick={handleScan}
            disabled={!selectedFile || isLoading}
            className="btn btn-primary"
            style={{
              width: '100%', padding: '12px', fontSize: '0.9rem', fontWeight: 700,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              opacity: (!selectedFile || isLoading) ? 0.5 : 1,
              cursor: (!selectedFile || isLoading) ? 'not-allowed' : 'pointer'
            }}
          >
            {isLoading ? (
              <>
                <Loader2 style={{ width: '18px', height: '18px', animation: 'spin 1s linear infinite' }} />
                Processing OCR + PII Scan...
              </>
            ) : (
              <>
                <ScanLine style={{ width: '18px', height: '18px' }} />
                Scan & Redact Document
              </>
            )}
          </button>
        </div>

        {/* Right Column: Results */}
        <div className="glass-panel" style={{ padding: '20px', minHeight: '400px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShieldCheck style={{ width: '16px', height: '16px', color: '#34d399' }} />
              <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)' }}>Scan Results</span>
            </div>
            {scanResult && (
              <button
                onClick={() => setShowRaw(!showRaw)}
                className="btn btn-ghost"
                style={{ padding: '4px 10px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                {showRaw ? <EyeOff style={{ width: '12px', height: '12px' }} /> : <Eye style={{ width: '12px', height: '12px' }} />}
                {showRaw ? 'Show Sanitized' : 'Show Raw'}
              </button>
            )}
          </div>

          {/* Empty State */}
          {!scanResult && !errorResult && !isLoading && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '320px', color: 'var(--text-muted)' }}>
              <FileImage style={{ width: '48px', height: '48px', marginBottom: '12px', opacity: 0.3 }} />
              <p style={{ fontSize: '0.9rem', fontWeight: 600 }}>No document scanned yet</p>
              <p style={{ fontSize: '0.75rem', marginTop: '4px' }}>Upload a document and click "Scan & Redact" to begin</p>
            </div>
          )}

          {/* Loading State */}
          {isLoading && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '320px', color: 'var(--text-muted)' }}>
              <Loader2 style={{ width: '40px', height: '40px', animation: 'spin 1s linear infinite', color: '#6366f1', marginBottom: '12px' }} />
              <p style={{ fontSize: '0.9rem', fontWeight: 600 }}>Running Tesseract.js OCR Engine...</p>
              <p style={{ fontSize: '0.75rem', marginTop: '4px' }}>Extracting text → PII Detection → Threat Evaluation</p>
            </div>
          )}

          {/* Error Result (403 blocks, OCR failures) */}
          {errorResult && (
            <div style={{
              background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '10px', padding: '16px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <AlertTriangle style={{ width: '18px', height: '18px', color: '#fca5a5' }} />
                <span style={{ fontWeight: 700, color: '#fca5a5', fontSize: '0.9rem' }}>
                  {errorResult.privacyShieldMeta?.actionTaken === 'BLOCKED' || errorResult.privacyShieldMeta?.actionTaken === 'QUARANTINED'
                    ? '🚫 Document Intercepted'
                    : 'Scan Error'}
                </span>
              </div>
              <p style={{ fontSize: '0.8rem', color: '#fecaca', marginBottom: '12px', lineHeight: 1.5 }}>
                {errorResult.error.message}
              </p>
              {errorResult.privacyShieldMeta && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px' }}>
                  {errorResult.privacyShieldMeta.riskLevel && (
                    <span className="badge" style={getRiskBadgeStyle(errorResult.privacyShieldMeta.riskLevel)}>
                      Risk: {errorResult.privacyShieldMeta.riskLevel}
                    </span>
                  )}
                  <span className="badge" style={{ background: 'rgba(99, 102, 241, 0.15)', color: '#a5b4fc', border: '1px solid rgba(99, 102, 241, 0.3)' }}>
                    Profile: {errorResult.privacyShieldMeta.activeProfile}
                  </span>
                  {errorResult.privacyShieldMeta.riskScore !== undefined && (
                    <span className="badge" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#fcd34d', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
                      Score: {errorResult.privacyShieldMeta.riskScore}
                    </span>
                  )}
                </div>
              )}
              {errorResult.privacyShieldMeta?.reasons && errorResult.privacyShieldMeta.reasons.length > 0 && (
                <div style={{ marginTop: '12px' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Threat Reasons:</span>
                  <ul style={{ margin: '4px 0 0 16px', padding: 0, fontSize: '0.75rem', color: '#fecaca' }}>
                    {errorResult.privacyShieldMeta.reasons.map((r, i) => <li key={i}>{r}</li>)}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Success Result */}
          {scanResult && (
            <div>
              {/* Metadata Header */}
              <div style={{
                display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '16px'
              }}>
                <div style={{ background: 'rgba(99, 102, 241, 0.08)', borderRadius: '8px', padding: '10px 12px', border: '1px solid rgba(99, 102, 241, 0.15)' }}>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '2px' }}>OCR Confidence</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#a5b4fc' }}>{scanResult.documentMetadata.ocrConfidence}%</div>
                </div>
                <div style={{ background: 'rgba(34, 197, 94, 0.08)', borderRadius: '8px', padding: '10px 12px', border: '1px solid rgba(34, 197, 94, 0.15)' }}>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '2px' }}>Tokens Redacted</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#86efac' }}>{scanResult.privacyShieldMeta.tokensRedacted}</div>
                </div>
                <div style={{ background: 'rgba(245, 158, 11, 0.08)', borderRadius: '8px', padding: '10px 12px', border: '1px solid rgba(245, 158, 11, 0.15)' }}>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '2px' }}>OCR Latency</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fcd34d' }}>{scanResult.privacyShieldMeta.ocrLatencyMs}ms</div>
                </div>
                <div style={{ background: 'rgba(139, 92, 246, 0.08)', borderRadius: '8px', padding: '10px 12px', border: '1px solid rgba(139, 92, 246, 0.15)' }}>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '2px' }}>Risk Level</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>
                    <span className="badge" style={getRiskBadgeStyle(scanResult.privacyShieldMeta.riskLevel)}>
                      {scanResult.privacyShieldMeta.riskLevel}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Taken Badge */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '14px' }}>
                <span className="badge" style={{ background: 'rgba(34, 197, 94, 0.15)', color: '#86efac', border: '1px solid rgba(34, 197, 94, 0.3)' }}>
                  ✅ {scanResult.privacyShieldMeta.actionTaken}
                </span>
                <span className="badge" style={{ background: 'rgba(99, 102, 241, 0.15)', color: '#a5b4fc', border: '1px solid rgba(99, 102, 241, 0.3)' }}>
                  Profile: {scanResult.privacyShieldMeta.activeProfile}
                </span>
                {scanResult.privacyShieldMeta.piiTypesDetected.length > 0 && scanResult.privacyShieldMeta.piiTypesDetected.map((t, i) => (
                  <span key={i} className="badge" style={{ background: 'rgba(236, 72, 153, 0.15)', color: '#f9a8d4', border: '1px solid rgba(236, 72, 153, 0.3)' }}>
                    {t}
                  </span>
                ))}
              </div>

              {/* Extracted Text (togglable raw vs sanitized) */}
              <div style={{ marginBottom: '14px' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  {showRaw ? '🔓 Raw Extracted Text' : '🔒 Sanitized Text (PII Redacted)'}
                </div>
                <pre style={{
                  background: 'rgba(0, 0, 0, 0.4)', border: '1px solid var(--border-color)',
                  borderRadius: '8px', padding: '12px', fontSize: '0.78rem', color: showRaw ? '#fca5a5' : '#86efac',
                  whiteSpace: 'pre-wrap', wordBreak: 'break-word', lineHeight: 1.5,
                  maxHeight: '200px', overflow: 'auto', fontFamily: 'var(--font-mono)'
                }}>
                  {showRaw ? scanResult.content.rawExtractedText : scanResult.content.sanitizedText}
                </pre>
              </div>

              {/* Redacted Entities Table */}
              {scanResult.content.redactedEntities.length > 0 && (
                <div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    🛡️ Redacted Entities ({scanResult.content.redactedEntities.length})
                  </div>
                  <div style={{
                    borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border-color)'
                  }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem' }}>
                      <thead>
                        <tr style={{ background: 'rgba(99, 102, 241, 0.1)' }}>
                          <th style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 700, color: '#a5b4fc', borderBottom: '1px solid var(--border-color)' }}>Type</th>
                          <th style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 700, color: '#a5b4fc', borderBottom: '1px solid var(--border-color)' }}>Placeholder</th>
                          <th style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 700, color: '#a5b4fc', borderBottom: '1px solid var(--border-color)' }}>Original</th>
                        </tr>
                      </thead>
                      <tbody>
                        {scanResult.content.redactedEntities.map((entity, idx) => (
                          <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                            <td style={{ padding: '6px 10px', color: '#f9a8d4', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{entity.type}</td>
                            <td style={{ padding: '6px 10px', color: '#86efac', fontFamily: 'var(--font-mono)' }}>{entity.placeholder}</td>
                            <td style={{ padding: '6px 10px', color: '#fca5a5', fontFamily: 'var(--font-mono)' }}>{entity.originalValue}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OcrScanner;
