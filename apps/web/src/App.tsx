import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { Playground } from './components/Playground';
import { AuditLedger } from './components/AuditLedger';
import { AnalyticsDashboard } from './components/AnalyticsDashboard';
import { DevDocs } from './components/DevDocs';
import { OcrScanner } from './components/OcrScanner';

const API_BASE_URL = import.meta.env.VITE_API_URL || '';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'playground' | 'audit' | 'analytics' | 'ocr' | 'docs'>('playground');
  const [isBackendHealthy, setIsBackendHealthy] = useState<boolean>(false);
  const [auditRefreshTrigger, setAuditRefreshTrigger] = useState<number>(0);

  const checkHealth = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/health`);
      if (res.ok) {
        setIsBackendHealthy(true);
      } else {
        setIsBackendHealthy(false);
      }
    } catch {
      setIsBackendHealthy(false);
    }
  };

  useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleLogCreated = () => {
    setAuditRefreshTrigger(prev => prev + 1);
  };

  return (
    <div className="app-container">
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isBackendHealthy={isBackendHealthy}
      />

      <main style={{ minHeight: '80vh' }}>
        {activeTab === 'playground' && (
          <Playground onLogCreated={handleLogCreated} />
        )}

        {activeTab === 'audit' && (
          <AuditLedger onRefreshTrigger={auditRefreshTrigger} />
        )}

        {activeTab === 'analytics' && (
          <AnalyticsDashboard />
        )}

        {activeTab === 'docs' && (
          <DevDocs />
        )}

        {activeTab === 'ocr' && (
          <OcrScanner />
        )}
      </main>

      <footer style={{
        marginTop: '40px',
        padding: '20px 0',
        borderTop: '1px solid var(--border-color)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        fontSize: '0.8rem',
        color: 'var(--text-muted)',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <div>
          PrivacyShield v1.0.0 • Zero-Trust AI Proxy Gateway & Compliance Dashboard for Zerops
        </div>
        <div style={{ display: 'flex', gap: '16px' }}>
          <span>GDPR Compliant</span>
          <span>•</span>
          <span>HIPAA Safe</span>
          <span>•</span>
          <span>PCI-DSS Shielded</span>
        </div>
      </footer>
    </div>
  );
};

export default App;
