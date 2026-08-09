import React from 'react';
import { Shield, Play, FileText, BarChart3, Code2, Server, ScanLine } from 'lucide-react';

interface NavbarProps {
  activeTab: 'playground' | 'audit' | 'analytics' | 'ocr' | 'docs';
  setActiveTab: (tab: 'playground' | 'audit' | 'analytics' | 'ocr' | 'docs') => void;
  isBackendHealthy: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab, setActiveTab, isBackendHealthy }) => {
  return (
    <header className="glass-panel" style={{ marginBottom: '24px', padding: '16px 24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        {/* Brand Logo & Tagline */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #6366f1 0%, #ec4899 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 20px rgba(99, 102, 241, 0.4)'
          }}>
            <Shield style={{ width: '24px', height: '24px', color: '#ffffff' }} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h1 style={{ fontSize: '1.4rem', fontWeight: 800, background: 'linear-gradient(to right, #ffffff, #a5b4fc)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                PrivacyShield
              </h1>
              <span className="badge" style={{ background: 'rgba(99, 102, 241, 0.2)', color: '#a5b4fc', border: '1px solid rgba(99, 102, 241, 0.4)' }}>
                v1.0.0 Zero-Trust
              </span>
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Open-Source AI Proxy Middleware & Compliance Gateway
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav style={{ display: 'flex', gap: '8px', background: 'rgba(0, 0, 0, 0.3)', padding: '6px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
          <button
            onClick={() => setActiveTab('playground')}
            className={`btn ${activeTab === 'playground' ? 'btn-primary' : 'btn-ghost'}`}
            style={{ padding: '8px 16px', fontSize: '0.85rem' }}
          >
            <Play style={{ width: '16px', height: '16px' }} />
            Playground Sandbox
          </button>

          <button
            onClick={() => setActiveTab('audit')}
            className={`btn ${activeTab === 'audit' ? 'btn-primary' : 'btn-ghost'}`}
            style={{ padding: '8px 16px', fontSize: '0.85rem' }}
          >
            <FileText style={{ width: '16px', height: '16px' }} />
            Audit Log Ledger
          </button>

          <button
            onClick={() => setActiveTab('analytics')}
            className={`btn ${activeTab === 'analytics' ? 'btn-primary' : 'btn-ghost'}`}
            style={{ padding: '8px 16px', fontSize: '0.85rem' }}
          >
            <BarChart3 style={{ width: '16px', height: '16px' }} />
            Compliance Analytics
          </button>

          <button
            onClick={() => setActiveTab('docs')}
            className={`btn ${activeTab === 'docs' ? 'btn-primary' : 'btn-ghost'}`}
            style={{ padding: '8px 16px', fontSize: '0.85rem' }}
          >
            <Code2 style={{ width: '16px', height: '16px' }} />
            Developer Setup & SDK
          </button>

          <button
            onClick={() => setActiveTab('ocr')}
            className={`btn ${activeTab === 'ocr' ? 'btn-primary' : 'btn-ghost'}`}
            style={{ padding: '8px 16px', fontSize: '0.85rem' }}
          >
            <ScanLine style={{ width: '16px', height: '16px' }} />
            OCR Scanner
          </button>
        </nav>

        {/* Zerops Environment Status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 12px',
            borderRadius: '9999px',
            background: 'rgba(16, 185, 129, 0.1)',
            border: '1px solid rgba(16, 185, 129, 0.2)',
            fontSize: '0.8rem',
            color: '#6ee7b7'
          }}>
            <Server style={{ width: '14px', height: '14px' }} />
            <span>Zerops Node.js Gateway:</span>
            <span style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span className="glow-point" style={{ backgroundColor: isBackendHealthy ? 'var(--success)' : 'var(--warning)' }}></span>
              {isBackendHealthy ? 'ONLINE (Port 3000)' : 'CONNECTING...'}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
};
