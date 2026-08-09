import React, { useState } from 'react';
import { Lock } from 'lucide-react';

interface SecurityBadgeProps {
  originalValue: string;
  tokenPlaceholder: string;
  entityType: string;
}

export const SecurityBadge: React.FC<SecurityBadgeProps> = ({
  originalValue,
  tokenPlaceholder,
  entityType,
}) => {
  const [showTooltip, setShowTooltip] = useState<boolean>(false);

  return (
    <span
      style={{ position: 'relative', display: 'inline-block', margin: '0 2px' }}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <span
        style={{
          backgroundColor: 'rgba(16, 185, 129, 0.15)',
          color: '#6ee7b7',
          border: '1px solid rgba(16, 185, 129, 0.4)',
          padding: '2px 8px',
          borderRadius: '4px',
          fontSize: '0.8rem',
          fontFamily: 'var(--font-mono)',
          fontWeight: 600,
          cursor: 'help',
          boxShadow: '0 0 10px rgba(16, 185, 129, 0.2)',
          transition: 'all 0.15s ease',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px'
        }}
      >
        <Lock style={{ width: '12px', height: '12px', color: '#10b981' }} />
        <span>{originalValue}</span>
      </span>

      {showTooltip && (
        <div
          style={{
            position: 'absolute',
            bottom: '100%',
            left: '50%',
            transform: 'translateX(-50%)',
            marginBottom: '8px',
            width: '260px',
            padding: '12px',
            backgroundColor: '#0f172a',
            border: '1px solid rgba(16, 185, 129, 0.4)',
            borderRadius: 'var(--radius-sm)',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.8), 0 0 15px rgba(16, 185, 129, 0.2)',
            textAlign: 'left',
            zIndex: 100,
            fontSize: '0.75rem',
            pointerEvents: 'none'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <span style={{ fontWeight: 700, color: '#6ee7b7', fontSize: '0.8rem' }}>
              {entityType} Masked
            </span>
            <span style={{ fontSize: '0.65rem', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', background: 'rgba(255, 255, 255, 0.05)', padding: '2px 6px', borderRadius: '4px' }}>
              Zero-Persistence
            </span>
          </div>

          <p style={{ color: 'var(--text-main)', fontSize: '0.75rem', marginBottom: '6px', lineHeight: 1.4 }}>
            Sent to LLM as: <code style={{ color: '#fcd34d', backgroundColor: 'rgba(0, 0, 0, 0.6)', padding: '2px 6px', borderRadius: '4px', fontFamily: 'var(--font-mono)' }}>{tokenPlaceholder}</code>
          </p>

          <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', borderTop: '1px solid var(--border-color)', paddingTop: '6px', marginTop: '4px', lineHeight: 1.3 }}>
            Rehydrated safely in memory — original sensitive values were never stored on external AI servers.
          </p>
        </div>
      )}
    </span>
  );
};

export default SecurityBadge;
