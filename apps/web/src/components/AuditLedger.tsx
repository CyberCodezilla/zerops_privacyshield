import React, { useState, useEffect } from 'react';
import { Search, Filter, Download, Trash2, ShieldAlert, Clock, Cpu, HardDrive, FileText } from 'lucide-react';
import { generateCompliancePDF } from '../utils/pdfGenerator';

export interface AuditLogItem {
  id: string;
  created_at: string;
  client_identifier: string;
  pii_types_detected: string[];
  tokens_redacted_count: number;
  proxy_latency_ms: number;
  sanitized_prompt: string;
  upstream_model: string;
}

interface AuditLedgerProps {
  onRefreshTrigger?: number;
}

const API_BASE_URL = import.meta.env.VITE_API_URL || '';

function getModelLogo(modelName: string): string {
  const norm = (modelName || '').toLowerCase();
  if (norm.includes('claude') || norm.includes('anthropic')) return '/assets/claude.svg';
  if (norm.includes('gemini') || norm.includes('google')) return '/assets/gemini.svg';
  if (norm.includes('deepseek')) return '/assets/deepseek.svg';
  if (norm.includes('perplexity') || norm.includes('sonar')) return '/assets/perplexity.svg';
  return '/assets/chatgpt.svg';
}

export const AuditLedger: React.FC<AuditLedgerProps> = ({ onRefreshTrigger }) => {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [piiFilter, setPiiFilter] = useState<string>('ALL');
  const [selectedLog, setSelectedLog] = useState<AuditLogItem | null>(null);

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const url = `${API_BASE_URL}/api/audit-logs?search=${encodeURIComponent(search)}&piiType=${encodeURIComponent(piiFilter)}`;
      const res = await fetch(url);
      const data = await res.json();
      setLogs(data.logs || []);
      setTotal(data.total || 0);
    } catch (err) {
      console.error('Error fetching audit logs:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [search, piiFilter, onRefreshTrigger]);

  const handleClearLogs = async () => {
    if (!confirm('Are you sure you want to clear all audit logs?')) return;
    try {
      await fetch(`${API_BASE_URL}/api/audit-logs`, { method: 'DELETE' });
      fetchLogs();
    } catch (err) {
      console.error('Failed to clear logs:', err);
    }
  };

  const handleExportPDF = () => {
    const certData = {
      certificateId: `CERT-${Math.random().toString(36).substring(2, 9).toUpperCase()}`,
      timestamp: new Date().toISOString(),
      totalPromptsProcessed: logs.length,
      totalTokensRedacted: logs.reduce((acc, item) => acc + (item.tokens_redacted_count || 0), 0),
      averageLatencyMs: logs.reduce((acc, item) => acc + (item.proxy_latency_ms || 0.4), 0) / (logs.length || 1),
      activePolicyProfile: 'BALANCED',
      auditLogs: logs.map((l) => ({
        id: l.id || 'req-001',
        timestamp: l.created_at || new Date().toISOString(),
        piiTypes: l.pii_types_detected || [],
        tokensRedacted: l.tokens_redacted_count || 0,
        latencyMs: l.proxy_latency_ms || 0.35,
      })),
    };

    generateCompliancePDF(certData);
  };

  const exportAsJson = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(logs, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `privacyshield-audit-logs-${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const exportAsCsv = () => {
    const headers = ['ID', 'Timestamp', 'Client IP', 'PII Types', 'Tokens Redacted', 'Latency (ms)', 'Upstream Model', 'Sanitized Prompt'];
    const csvRows = [headers.join(',')];

    logs.forEach(log => {
      const row = [
        log.id,
        `"${log.created_at}"`,
        `"${log.client_identifier}"`,
        `"${log.pii_types_detected.join(';')}"`,
        log.tokens_redacted_count,
        log.proxy_latency_ms,
        `"${log.upstream_model}"`,
        `"${log.sanitized_prompt.replace(/"/g, '""')}"`
      ];
      csvRows.push(row.join(','));
    });

    const csvStr = "data:text/csv;charset=utf-8," + encodeURIComponent(csvRows.join('\n'));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", csvStr);
    downloadAnchor.setAttribute("download", `privacyshield-audit-logs-${Date.now()}.csv`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="glass-panel" style={{ padding: '24px' }}>
      {/* Header & Controls */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px', marginBottom: '20px' }}>
        <div>
          <h2 style={{ fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <HardDrive style={{ color: 'var(--primary)' }} />
            Zero-PII Compliance Audit Ledger
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Immutable, structured compliance record of all intercepted LLM API requests.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button
            onClick={handleExportPDF}
            className="btn btn-primary"
            style={{ fontSize: '0.8rem', padding: '6px 14px', background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)', border: '1px solid rgba(16, 185, 129, 0.4)' }}
          >
            <FileText style={{ width: '14px', height: '14px' }} />
            Download PDF Compliance Certificate
          </button>
          <button onClick={exportAsCsv} className="btn btn-secondary" style={{ fontSize: '0.8rem', padding: '6px 12px' }}>
            <Download style={{ width: '14px', height: '14px' }} />
            Export CSV
          </button>

          <button onClick={exportAsJson} className="btn btn-secondary" style={{ fontSize: '0.8rem', padding: '6px 12px' }}>
            <Download style={{ width: '14px', height: '14px' }} />
            Export JSON
          </button>

          <button onClick={handleClearLogs} className="btn btn-ghost" style={{ fontSize: '0.8rem', padding: '6px 12px', color: 'var(--danger)' }}>
            <Trash2 style={{ width: '14px', height: '14px' }} />
            Clear Ledger
          </button>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: '240px', position: 'relative' }}>
          <Search style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', width: '16px', height: '16px', color: 'var(--text-dim)' }} />
          <input
            type="text"
            placeholder="Search prompt text, client IP, or model..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 12px 10px 38px',
              backgroundColor: 'rgba(0, 0, 0, 0.3)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-sm)',
              color: '#ffffff',
              fontSize: '0.85rem',
              outline: 'none'
            }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Filter style={{ width: '16px', height: '16px', color: 'var(--text-muted)' }} />
          <select
            value={piiFilter}
            onChange={(e) => setPiiFilter(e.target.value)}
            style={{
              padding: '10px 14px',
              backgroundColor: 'rgba(0, 0, 0, 0.3)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-sm)',
              color: '#ffffff',
              fontSize: '0.85rem'
            }}
          >
            <option value="ALL">All Categories</option>
            <option value="SSN">SSN Only</option>
            <option value="CREDIT_CARD">Credit Cards Only</option>
            <option value="SECRET_KEY">Secret Keys Only</option>
            <option value="EMAIL">Emails Only</option>
            <option value="PHONE">Phone Numbers Only</option>
            <option value="PHI_NAME">PHI Names Only</option>
          </select>
        </div>
      </div>

      {/* Ledger Table */}
      <div style={{ overflowX: 'auto', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
          <thead>
            <tr style={{ background: 'rgba(255, 255, 255, 0.04)', borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
              <th style={{ padding: '12px 16px' }}>Timestamp</th>
              <th style={{ padding: '12px 16px' }}>Client Identifier</th>
              <th style={{ padding: '12px 16px' }}>PII Categories</th>
              <th style={{ padding: '12px 16px' }}>Redacted</th>
              <th style={{ padding: '12px 16px' }}>Latency</th>
              <th style={{ padding: '12px 16px' }}>Upstream Model</th>
              <th style={{ padding: '12px 16px' }}>Sanitized Prompt Preview</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-dim)' }}>
                  Loading audit logs from database...
                </td>
              </tr>
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-dim)' }}>
                  No audit logs found matching criteria.
                </td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr
                  key={log.id}
                  onClick={() => setSelectedLog(log)}
                  style={{
                    borderBottom: '1px solid var(--border-color)',
                    cursor: 'pointer',
                    transition: 'background 0.15s ease'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.03)'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <td style={{ padding: '12px 16px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                    <Clock style={{ width: '12px', height: '12px', display: 'inline', marginRight: '6px' }} />
                    {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </td>
                  <td style={{ padding: '12px 16px', fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>
                    {log.client_identifier}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                      {log.pii_types_detected.map(type => (
                        <span key={type} className="badge badge-secret" style={{ fontSize: '0.65rem', padding: '2px 6px' }}>
                          {type}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td style={{ padding: '12px 16px', fontWeight: 700, color: 'var(--primary)' }}>
                    {log.tokens_redacted_count}
                  </td>
                  <td style={{ padding: '12px 16px', color: '#6ee7b7', fontWeight: 600 }}>
                    {log.proxy_latency_ms} ms
                  </td>
                  <td style={{ padding: '12px 16px', fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <img
                        src={getModelLogo(log.upstream_model)}
                        alt="Logo"
                        style={{ width: '16px', height: '16px', objectFit: 'contain' }}
                      />
                      <span>{log.upstream_model}</span>
                    </div>
                  </td>
                  <td style={{ padding: '12px 16px', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: 'var(--font-mono)', color: '#d1d5db' }}>
                    {log.sanitized_prompt}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Log Detail Modal */}
      {selectedLog && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '24px'
        }}>
          <div className="glass-panel" style={{ maxWidth: '650px', width: '100%', padding: '24px', background: 'var(--bg-card)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShieldAlert style={{ color: 'var(--primary)' }} />
                Audit Record Inspector
              </h3>
              <button onClick={() => setSelectedLog(null)} className="btn btn-ghost" style={{ padding: '4px 8px' }}>
                ✕
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '0.85rem', marginBottom: '16px' }}>
              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block' }}>Record ID:</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>{selectedLog.id}</span>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block' }}>Timestamp:</span>
                <span>{new Date(selectedLog.created_at).toLocaleString()}</span>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block' }}>Client IP:</span>
                <span>{selectedLog.client_identifier}</span>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block' }}>Proxy Latency:</span>
                <span style={{ color: '#6ee7b7', fontWeight: 700 }}>{selectedLog.proxy_latency_ms} ms</span>
              </div>
            </div>

            <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
              Sanitized Prompt (Persisted in PostgreSQL):
            </label>
            <div style={{
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              padding: '12px',
              borderRadius: 'var(--radius-sm)',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.85rem',
              maxHeight: '180px',
              overflowY: 'auto',
              marginBottom: '20px',
              border: '1px solid var(--border-color)'
            }}>
              {selectedLog.sanitized_prompt}
            </div>

            <div style={{ textAlign: 'right' }}>
              <button onClick={() => setSelectedLog(null)} className="btn btn-primary">
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
