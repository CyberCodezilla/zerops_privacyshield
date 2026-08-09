import React, { useState, useEffect } from 'react';
import { Shield, Plus, X, Check, Lock, Sliders, AlertOctagon } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_URL || '';

export const PolicyManager: React.FC = () => {
  const [activeProfile, setActiveProfile] = useState<string>('BALANCED');
  const [customKeywords, setCustomKeywords] = useState<string[]>(['ProjectManhattan', 'SecretCodenameX']);
  const [newKeywordInput, setNewKeywordInput] = useState<string>('');
  const [isSaved, setIsSaved] = useState<boolean>(false);

  const fetchPolicy = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/policy`);
      if (res.ok) {
        const data = await res.json();
        if (data.activeProfile) setActiveProfile(data.activeProfile);
        if (data.customBlockedKeywords) setCustomKeywords(data.customBlockedKeywords);
      }
    } catch (err) {
      console.error('Error fetching policy config:', err);
    }
  };

  useEffect(() => {
    fetchPolicy();
  }, []);

  const syncPolicyUpdate = async (profileName: string, keywords: string[]) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/policy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          activeProfile: profileName,
          customBlockedKeywords: keywords
        })
      });
      if (res.ok) {
        setIsSaved(true);
        setTimeout(() => setIsSaved(false), 2000);
      }
    } catch (err) {
      console.error('Failed to sync policy update:', err);
    }
  };

  const handleProfileSelect = (newProfile: string) => {
    setActiveProfile(newProfile);
    syncPolicyUpdate(newProfile, customKeywords);
  };

  const handleAddKeyword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeywordInput.trim()) return;

    const trimmed = newKeywordInput.trim();
    if (!customKeywords.includes(trimmed)) {
      const updatedList = [...customKeywords, trimmed];
      setCustomKeywords(updatedList);
      syncPolicyUpdate(activeProfile, updatedList);
    }
    setNewKeywordInput('');
  };

  const handleRemoveKeyword = (keywordToRemove: string) => {
    const updatedList = customKeywords.filter(k => k !== keywordToRemove);
    setCustomKeywords(updatedList);
    syncPolicyUpdate(activeProfile, updatedList);
  };

  return (
    <div className="glass-panel" style={{ padding: '20px', marginBottom: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
        <div>
          <h3 style={{ fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sliders style={{ color: 'var(--primary)', width: '18px', height: '18px' }} />
            Active Compliance Policy Profile
          </h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Switch security enforcement profiles dynamically and manage confidential enterprise keyword blacklists.
          </p>
        </div>

        {isSaved && (
          <span className="badge" style={{ background: 'rgba(16, 185, 129, 0.2)', color: '#6ee7b7', border: '1px solid rgba(16, 185, 129, 0.4)' }}>
            <Check style={{ width: '12px', height: '12px' }} /> Policy Synced Live
          </span>
        )}
      </div>

      {/* Mode Selector Buttons */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px', marginBottom: '20px' }}>
        <button
          onClick={() => handleProfileSelect('STRICT')}
          style={{
            padding: '14px',
            borderRadius: 'var(--radius-sm)',
            border: activeProfile === 'STRICT' ? '2px solid var(--accent-pink)' : '1px solid var(--border-color)',
            backgroundColor: activeProfile === 'STRICT' ? 'rgba(236, 72, 153, 0.15)' : 'rgba(0, 0, 0, 0.3)',
            color: '#ffffff',
            textAlign: 'left',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
            <span style={{ fontWeight: 700, fontSize: '0.85rem', color: '#f472b6' }}>STRICT MODE (HIPAA / FinTech)</span>
            {activeProfile === 'STRICT' && <Check style={{ width: '16px', height: '16px', color: '#f472b6' }} />}
          </div>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Redacts ALL PII (Names, SSN, PCI Cards, Medical IDs, Emails, Phone) and blocks secret keys.
          </p>
        </button>

        <button
          onClick={() => handleProfileSelect('BALANCED')}
          style={{
            padding: '14px',
            borderRadius: 'var(--radius-sm)',
            border: activeProfile === 'BALANCED' ? '2px solid var(--primary)' : '1px solid var(--border-color)',
            backgroundColor: activeProfile === 'BALANCED' ? 'rgba(99, 102, 241, 0.15)' : 'rgba(0, 0, 0, 0.3)',
            color: '#ffffff',
            textAlign: 'left',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
            <span style={{ fontWeight: 700, fontSize: '0.85rem', color: '#a5b4fc' }}>BALANCED MODE (DevSecOps - Default)</span>
            {activeProfile === 'BALANCED' && <Check style={{ width: '16px', height: '16px', color: '#a5b4fc' }} />}
          </div>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Redacts Secrets, SSNs, Credit Cards, Emails & Phone; preserves general conversational names.
          </p>
        </button>

        <button
          onClick={() => handleProfileSelect('PERMISSIVE')}
          style={{
            padding: '14px',
            borderRadius: 'var(--radius-sm)',
            border: activeProfile === 'PERMISSIVE' ? '2px solid var(--success)' : '1px solid var(--border-color)',
            backgroundColor: activeProfile === 'PERMISSIVE' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(0, 0, 0, 0.3)',
            color: '#ffffff',
            textAlign: 'left',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
            <span style={{ fontWeight: 700, fontSize: '0.85rem', color: '#6ee7b7' }}>PERMISSIVE MODE (Credentials Only)</span>
            {activeProfile === 'PERMISSIVE' && <Check style={{ width: '16px', height: '16px', color: '#6ee7b7' }} />}
          </div>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Redacts infrastructure secret keys & DB credentials only; permits standard text.
          </p>
        </button>
      </div>

      {/* Custom Confidential Phrase Blacklist */}
      <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
        <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '8px' }}>
          Custom Confidential Phrase Blacklist:
        </label>

        <form onSubmit={handleAddKeyword} style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
          <input
            type="text"
            placeholder="Add confidential phrase (e.g. ProjectManhattan, SecretCodenameX)..."
            value={newKeywordInput}
            onChange={(e) => setNewKeywordInput(e.target.value)}
            style={{
              flex: 1,
              padding: '8px 12px',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: 'rgba(0, 0, 0, 0.4)',
              border: '1px solid var(--border-color)',
              color: '#ffffff',
              fontSize: '0.85rem',
              outline: 'none'
            }}
          />
          <button type="submit" className="btn btn-secondary" style={{ padding: '8px 14px', fontSize: '0.8rem' }}>
            <Plus style={{ width: '14px', height: '14px' }} />
            Add Phrase
          </button>
        </form>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {customKeywords.map((kw) => (
            <span
              key={kw}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 10px',
                borderRadius: '9999px',
                backgroundColor: 'rgba(239, 68, 68, 0.15)',
                color: '#fca5a5',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                fontSize: '0.8rem',
                fontFamily: 'var(--font-mono)'
              }}
            >
              <AlertOctagon style={{ width: '12px', height: '12px' }} />
              {kw}
              <button
                onClick={() => handleRemoveKeyword(kw)}
                style={{ background: 'none', border: 'none', color: '#fca5a5', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                title="Remove phrase"
              >
                <X style={{ width: '12px', height: '12px' }} />
              </button>
            </span>
          ))}

          {customKeywords.length === 0 && (
            <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>No custom confidential phrases added.</span>
          )}
        </div>
      </div>
    </div>
  );
};
