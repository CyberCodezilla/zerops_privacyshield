import React, { useState, useEffect } from 'react';
import { Shield, Server, Check, Sliders, Zap, Lock, RefreshCw, Globe, AlertCircle } from 'lucide-react';
import { getConfig, updateConfig, ExtensionConfig, DEFAULT_CONFIG } from '../utils/storage';

export const Popup: React.FC = () => {
  const [config, setConfig] = useState<ExtensionConfig>(DEFAULT_CONFIG);
  const [isHealthChecking, setIsHealthChecking] = useState(false);
  const [healthStatus, setHealthStatus] = useState<'ONLINE' | 'OFFLINE' | 'IDLE'>('IDLE');
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    getConfig().then((loaded) => setConfig(loaded));
  }, []);

  const handleSaveConfig = async (updatedFields: Partial<ExtensionConfig>) => {
    const updated = await updateConfig(updatedFields);
    setConfig(updated);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2000);
  };

  const checkApiHealth = async () => {
    setIsHealthChecking(true);
    setHealthStatus('IDLE');
    try {
      const res = await fetch(`${config.apiUrl}/health`, { method: 'GET' });
      if (res.ok) {
        setHealthStatus('ONLINE');
      } else {
        setHealthStatus('OFFLINE');
      }
    } catch {
      setHealthStatus('OFFLINE');
    } finally {
      setIsHealthChecking(false);
    }
  };

  return (
    <div style={{
      width: '360px',
      padding: '20px',
      background: '#090d16',
      color: '#f8fafc',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      boxSizing: 'border-box'
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '34px', height: '34px', borderRadius: '8px',
            background: 'linear-gradient(135deg, #6366f1 0%, #ec4899 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 15px rgba(99, 102, 241, 0.4)'
          }}>
            <Shield style={{ width: '18px', height: '18px', color: '#fff' }} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0, background: 'linear-gradient(to right, #fff, #a5b4fc)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              PrivacyShield
            </h1>
            <p style={{ fontSize: '0.7rem', color: '#94a3b8', margin: 0 }}>
              Zero-Trust AI Browser Protection
            </p>
          </div>
        </div>

        {/* Global Enable Toggle */}
        <button
          onClick={() => handleSaveConfig({ enabled: !config.enabled })}
          style={{
            padding: '6px 12px',
            borderRadius: '9999px',
            border: config.enabled ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid rgba(239, 68, 68, 0.4)',
            background: config.enabled ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
            color: config.enabled ? '#6ee7b7' : '#fca5a5',
            fontSize: '0.75rem',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: config.enabled ? '#10b981' : '#ef4444' }}></span>
          {config.enabled ? 'ACTIVE' : 'DISABLED'}
        </button>
      </div>

      {/* Main Settings Panel */}
      <div style={{ background: 'rgba(30, 41, 59, 0.5)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '12px', padding: '14px', marginBottom: '14px' }}>
        
        {/* Zerops API Backend URL Config */}
        <div style={{ marginBottom: '14px' }}>
          <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '6px' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Globe style={{ width: '13px', height: '13px', color: '#a5b4fc' }} />
              Zerops API Backend URL
            </span>
            <button
              onClick={() => handleSaveConfig({ apiUrl: 'http://localhost:3000' })}
              style={{ background: 'none', border: 'none', color: '#818cf8', fontSize: '0.65rem', cursor: 'pointer', textDecoration: 'underline', padding: 0 }}
            >
              Use Localhost
            </button>
          </label>

          <div style={{ display: 'flex', gap: '6px' }}>
            <input
              type="text"
              value={config.apiUrl}
              onChange={(e) => handleSaveConfig({ apiUrl: e.target.value })}
              placeholder="https://api-zerops.privacyshield.app"
              style={{
                flex: 1,
                padding: '7px 10px',
                borderRadius: '6px',
                background: 'rgba(15, 23, 42, 0.8)',
                border: '1px solid rgba(99, 102, 241, 0.3)',
                color: '#fff',
                fontSize: '0.75rem',
                fontFamily: 'monospace'
              }}
            />
            <button
              onClick={checkApiHealth}
              disabled={isHealthChecking}
              style={{
                padding: '7px 10px',
                borderRadius: '6px',
                background: 'rgba(99, 102, 241, 0.2)',
                border: '1px solid rgba(99, 102, 241, 0.4)',
                color: '#a5b4fc',
                fontSize: '0.75rem',
                cursor: 'pointer'
              }}
            >
              {isHealthChecking ? <RefreshCw style={{ width: '12px', height: '12px', animation: 'spin 1s linear infinite' }} /> : 'Test'}
            </button>
          </div>

          {healthStatus !== 'IDLE' && (
            <div style={{ fontSize: '0.7rem', marginTop: '6px', color: healthStatus === 'ONLINE' ? '#6ee7b7' : '#fca5a5', display: 'flex', alignItems: 'center', gap: '4px' }}>
              {healthStatus === 'ONLINE' ? <Check style={{ width: '12px', height: '12px' }} /> : <AlertCircle style={{ width: '12px', height: '12px' }} />}
              Backend status: <strong>{healthStatus}</strong>
            </div>
          )}
        </div>

        {/* Policy Profile Selector */}
        <div style={{ marginBottom: '14px' }}>
          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '6px' }}>
            Compliance Policy Profile
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px' }}>
            {(['STRICT', 'BALANCED', 'PERMISSIVE'] as const).map((profile) => (
              <button
                key={profile}
                onClick={() => handleSaveConfig({ activeProfile: profile })}
                style={{
                  padding: '6px',
                  borderRadius: '6px',
                  border: config.activeProfile === profile ? '1px solid #6366f1' : '1px solid rgba(255,255,255,0.1)',
                  background: config.activeProfile === profile ? 'rgba(99, 102, 241, 0.25)' : 'rgba(15, 23, 42, 0.6)',
                  color: config.activeProfile === profile ? '#a5b4fc' : '#94a3b8',
                  fontSize: '0.7rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                {profile}
              </button>
            ))}
          </div>
        </div>

        {/* Zero-Knowledge Mode Switch */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Lock style={{ width: '12px', height: '12px', color: '#10b981' }} />
              Zero-Knowledge RAM Mode
            </div>
            <div style={{ fontSize: '0.65rem', color: '#94a3b8' }}>
              Sanitizes PII 100% in browser RAM
            </div>
          </div>
          <input
            type="checkbox"
            checked={config.zeroKnowledge}
            onChange={(e) => handleSaveConfig({ zeroKnowledge: e.target.checked })}
            style={{ width: '16px', height: '16px', accentColor: '#6366f1', cursor: 'pointer' }}
          />
        </div>
      </div>

      {/* Stats Counter */}
      <div style={{
        background: 'rgba(16, 185, 129, 0.08)',
        border: '1px solid rgba(16, 185, 129, 0.2)',
        borderRadius: '10px',
        padding: '10px 14px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
          Lifetime PII Tokens Redacted:
        </div>
        <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#34d399', fontFamily: 'monospace' }}>
          {config.statsRedactedCount || 0}
        </div>
      </div>

      {savedSuccess && (
        <div style={{ marginTop: '8px', textAlign: 'center', fontSize: '0.7rem', color: '#6ee7b7' }}>
          ✓ Config saved automatically
        </div>
      )}
    </div>
  );
};

export default Popup;
