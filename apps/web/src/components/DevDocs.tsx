import React, { useState } from 'react';
import { Code2, Copy, Check, Terminal, Layers, Server } from 'lucide-react';

export const DevDocs: React.FC = () => {
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(label);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const pythonSnippet = `from openai import OpenAI

# Drop-in PrivacyShield AI Gateway (Change 1 Line: base_url)
client = OpenAI(
    api_key="sk-proj-...",  # Your standard OpenAI key
    base_url="http://localhost:3000/v1"  # Or your Zerops subdomain: https://api-privacyshield.zerops.app/v1
)

response = client.chat.completions.create(
    model="gpt-4o",
    messages=[
        {"role": "user", "content": "Patient Jane Doe (SSN: 123-45-6789) paid using card 4111-2222-3333-4444."}
    ]
)

print(response.choices[0].message.content)
`;

  const nodeSnippet = `import OpenAI from 'openai';

// Single-line baseURL configuration makes your existing app zero-trust compliant!
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: 'http://localhost:3000/v1', // PrivacyShield Node.js Gateway
});

async function main() {
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'user', content: 'Debug database error with connection string postgresql://admin:secret@db:5432/app' },
    ],
  });

  console.log(completion.choices[0].message.content);
}

main();
`;

  const curlSnippet = `curl http://localhost:3000/v1/chat/completions \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer sk-proj-12345" \\
  -d '{
    "model": "gpt-4o",
    "messages": [
      {
        "role": "user",
        "content": "Patient Jane Doe (SSN: 123-45-6789) paid using card 4111-2222-3333-4444. Summarize diagnosis."
      }
    ],
    "temperature": 0.2
  }'
`;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header */}
      <div className="glass-panel" style={{ padding: '24px' }}>
        <h2 style={{ fontSize: '1.3rem', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Code2 style={{ color: 'var(--primary)' }} />
          Drop-In Developer Integration & Zerops Specs
        </h2>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          PrivacyShield acts as a transparent reverse proxy. Enable zero-trust compliance across your microservices by changing only the <code style={{ color: 'var(--primary)', fontFamily: 'var(--font-mono)' }}>baseURL</code>.
        </p>
      </div>

      {/* Code Snippets Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '20px' }}>
        {/* Python Snippet */}
        <div className="glass-panel" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Terminal style={{ width: '16px', height: '16px', color: 'var(--accent-cyan)' }} />
              Python OpenAI SDK Setup
            </span>
            <button
              onClick={() => copyToClipboard(pythonSnippet, 'python')}
              className="btn btn-ghost"
              style={{ padding: '4px 8px', fontSize: '0.75rem' }}
            >
              {copiedCode === 'python' ? <Check style={{ width: '14px', height: '14px', color: 'var(--success)' }} /> : <Copy style={{ width: '14px', height: '14px' }} />}
              {copiedCode === 'python' ? 'Copied!' : 'Copy Code'}
            </button>
          </div>

          <pre style={{
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            padding: '14px',
            borderRadius: 'var(--radius-sm)',
            fontFamily: 'var(--font-mono)',
            fontSize: '0.8rem',
            color: '#a5b4fc',
            overflowX: 'auto',
            lineHeight: 1.5,
            border: '1px solid var(--border-color)'
          }}>
            {pythonSnippet}
          </pre>
        </div>

        {/* Node.js Snippet */}
        <div className="glass-panel" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Terminal style={{ width: '16px', height: '16px', color: 'var(--primary)' }} />
              Node.js / TypeScript SDK Setup
            </span>
            <button
              onClick={() => copyToClipboard(nodeSnippet, 'node')}
              className="btn btn-ghost"
              style={{ padding: '4px 8px', fontSize: '0.75rem' }}
            >
              {copiedCode === 'node' ? <Check style={{ width: '14px', height: '14px', color: 'var(--success)' }} /> : <Copy style={{ width: '14px', height: '14px' }} />}
              {copiedCode === 'node' ? 'Copied!' : 'Copy Code'}
            </button>
          </div>

          <pre style={{
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            padding: '14px',
            borderRadius: 'var(--radius-sm)',
            fontFamily: 'var(--font-mono)',
            fontSize: '0.8rem',
            color: '#a5b4fc',
            overflowX: 'auto',
            lineHeight: 1.5,
            border: '1px solid var(--border-color)'
          }}>
            {nodeSnippet}
          </pre>
        </div>
      </div>

      {/* cURL Snippet */}
      <div className="glass-panel" style={{ padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Terminal style={{ width: '16px', height: '16px', color: 'var(--accent-pink)' }} />
            cURL Request Payload Example
          </span>
          <button
            onClick={() => copyToClipboard(curlSnippet, 'curl')}
            className="btn btn-ghost"
            style={{ padding: '4px 8px', fontSize: '0.75rem' }}
          >
            {copiedCode === 'curl' ? <Check style={{ width: '14px', height: '14px', color: 'var(--success)' }} /> : <Copy style={{ width: '14px', height: '14px' }} />}
            {copiedCode === 'curl' ? 'Copied!' : 'Copy Code'}
          </button>
        </div>

        <pre style={{
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          padding: '14px',
          borderRadius: 'var(--radius-sm)',
          fontFamily: 'var(--font-mono)',
          fontSize: '0.8rem',
          color: '#6ee7b7',
          overflowX: 'auto',
          lineHeight: 1.5,
          border: '1px solid var(--border-color)'
        }}>
          {curlSnippet}
        </pre>
      </div>

      {/* Dual-Engine Architecture Breakdown */}
      <div className="glass-panel" style={{ padding: '24px' }}>
        <h3 style={{ fontSize: '1.1rem', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Layers style={{ color: 'var(--accent-pink)' }} />
          Dual-Engine Detection Strategy (Sub-10ms & Zero-GPU Architecture)
        </h3>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '16px', lineHeight: 1.6 }}>
          PrivacyShield achieves enterprise zero-trust compliance while remaining under 250MB RAM without requiring expensive local NLP/NER models or GPU instances:
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
          <div style={{ background: 'rgba(99, 102, 241, 0.05)', padding: '16px', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(99, 102, 241, 0.2)' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#a5b4fc', display: 'block', marginBottom: '6px' }}>
              1. Deterministic Layer (100% Precision)
            </span>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
              Strict regex matchers + Luhn Algorithm validation for SSN, PCI Credit Cards, Secret Keys (<code style={{ color: '#f472b6' }}>sk_live_*</code>, <code style={{ color: '#f472b6' }}>AKIA*</code>, JWT, DB URIs), Emails, and Phone Numbers.
            </p>
          </div>

          <div style={{ background: 'rgba(16, 185, 129, 0.05)', padding: '16px', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#6ee7b7', display: 'block', marginBottom: '6px' }}>
              2. Contextual Pattern Layer (Zero-GPU Lightweight)
            </span>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
              Prefix & suffix contextual trigger matchers for PHI Names (words following "Patient", "User", "Client", "Dr.") and Medical IDs (MRNs). Sub-millisecond performance with 0MB neural overhead.
            </p>
          </div>

          <div style={{ background: 'rgba(239, 68, 68, 0.05)', padding: '16px', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#fca5a5', display: 'block', marginBottom: '6px' }}>
              4. Autonomous Risk Engine & Injection Interception
            </span>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
              Evaluates risk score (0.0 - 1.0). Autonomously blocks live infrastructure secrets (<code style={{ color: '#fca5a5' }}>sk_live_*</code>, DB URIs) and quarantines prompt injection / jailbreak attacks before hitting LLM APIs.
            </p>
          </div>
        </div>
      </div>

      {/* Zerops Deployment Footprint */}
      <div className="glass-panel" style={{ padding: '24px' }}>
        <h3 style={{ fontSize: '1.1rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Layers style={{ color: 'var(--primary)' }} />
          Zerops Footprint & Service Architecture
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
          <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '16px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, color: '#ffffff', marginBottom: '4px' }}>
              <Server style={{ width: '16px', height: '16px', color: 'var(--primary)' }} />
              api (Node.js 20 Container)
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Fastify Gateway running PII detection engine, per-request session state map, and proxy rehydration.
            </p>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', display: 'block', marginTop: '6px' }}>
              Autoscaling RAM: 0.25 - 0.5 GB | Port 3000
            </span>
          </div>

          <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '16px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, color: '#ffffff', marginBottom: '4px' }}>
              <Server style={{ width: '16px', height: '16px', color: 'var(--accent-cyan)' }} />
              web (Static Container)
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              React + Vite SPA providing live interactive sandbox, audit ledger, and compliance analytics.
            </p>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', display: 'block', marginTop: '6px' }}>
              Static Web Service | Subdomain Access Enabled
            </span>
          </div>

          <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '16px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, color: '#ffffff', marginBottom: '4px' }}>
              <Server style={{ width: '16px', height: '16px', color: 'var(--warning)' }} />
              db (PostgreSQL 16 Service)
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Managed audit store recording client IP, PII types detected, latency metrics, and zero-PII prompts.
            </p>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', display: 'block', marginTop: '6px' }}>
              PostgreSQL 16 | GIN Indexed Audit Ledger
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
