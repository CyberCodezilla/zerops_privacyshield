# PrivacyShield: Zero-Trust AI Proxy Gateway & Compliance Dashboard

[![Zerops Approved](https://img.shields.io/badge/Zerops-Deploy_Ready-6366f1)](https://zerops.io)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Compliance](https://img.shields.io/badge/Compliance-GDPR_|_HIPAA_|_PCI--DSS-10b981)](#compliance)

**PrivacyShield** is an open-source, zero-trust AI proxy middleware and compliance dashboard designed to prevent Personally Identifiable Information (PII), Protected Health Information (PHI), API secret keys, and enterprise intellectual property from leaking into external LLM APIs (OpenAI, Anthropic, Gemini, etc.).

It acts as a transparent, drop-in replacement gateway compatible with standard LLM SDKs (`baseURL`), redacting sensitive data in under 10ms using deterministic token substitution, forwarding sanitized payloads upstream, and rehydrating responses before returning them to the caller.

---

## 🚀 Key Features

- **Drop-In OpenAI Proxy Compatibility**: Intercepts `POST /v1/chat/completions` with streaming (SSE) and non-streaming support.
- **Deterministic PII & Secret Redaction Engine**:
  - **SSN**: US Social Security Numbers (`XXX-XX-XXXX`).
  - **Payment Cards (PCI)**: Luhn-validated 13–19 digit strings (Visa, Mastercard, Amex, Discover).
  - **Secrets & API Keys**: `sk_live_*`, `AKIA*`, JWT patterns, database connection strings (`postgresql://`, `mongodb://`, `mysql://`).
  - **RFC 5322 Email & Phone Numbers**: Standard pattern matching.
  - **Healthcare PHI**: Patient names, MRNs (`MRN-XXXXXX`).
- **Session State & Response Rehydration**: Isolated per-request token dictionary (`[TOKEN] -> OriginalValue`) restores sensitive data in completions while enforcing a strict **Zero-Persistence Policy** (RAM only).
- **Audit Log Ledger & PostgreSQL Store**: Structured, zero-PII audit trail capturing client IP, PII types detected, redacted token count, proxy latency (ms), and sanitized prompts.
- **Interactive 3-Panel Playground**: Real-time visual sandbox comparing unsanitized input, sanitized payload passed upstream, and rehydrated response delivered to the client.
- **Zerops Footprint Ready**: Pre-configured `import.yaml` and `zerops.yaml` for instant single-click cloud deployment on Zerops.

---

## 📐 System Architecture

```
                  +-------------------------------------------------------------+
                  |                 Zerops Managed Environment                  |
                  |                                                             |
                  |  +------------------+             +----------------------+  |
                  |  | Static Container |             | PostgreSQL Service   |  |
                  |  |  (apps/web)      |             | (db)                 |  |
                  |  |  React Dashboard |             | Audit Log Store      |  |
                  |  +--------+---------+             +----------^-----------+  |
                  |           |                                  |              |
                  |           | REST/WS                          | DB Client    |
                  |           v                                  |              |
+--------------+  |  +-------------------------------------------+-----------+  |    Sanitized
| Client App / |  |  | Node.js Container (apps/api)                          |  |    Request      +---------------+
| OpenAI SDK   +-----> Intercept -> PII Engine -> Tokenize -> Audit Log      +-------------------> External LLM   |
|              <-----+ De-tokenize <- Rehydrate Response                     <-------------------+ API (OpenAI)   |
+--------------+  |  +-------------------------------------------------------+  |    Raw Response +---------------+
  Drop-in API     |                                                             |
  (`baseURL`)     +-------------------------------------------------------------+
```

---

## ☁️ Zerops Deployment Configuration

### 1. `import.yaml`
```yaml
project:
  name: privacyshield
  services:
    - hostname: api
      type: nodejs@20
      mode: NON_HA
      verticalAutoscaling:
        minCpu: 1
        maxCpu: 2
        minRam: 0.25
        maxRam: 0.5
      enableSubdomainAccess: true

    - hostname: web
      type: static
      enableSubdomainAccess: true

    - hostname: db
      type: postgresql@16
      mode: NON_HA
```

### 2. `zerops.yaml`
```yaml
zerops:
  - setup: api
    build:
      base: nodejs@20
      buildCommands:
        - npm install
        - npm run build --workspace=apps/api
      deployFiles:
        - apps/api/dist/~
        - apps/api/package.json
        - package.json
    run:
      base: nodejs@20
      ports:
        - port: 3000
      start: node apps/api/dist/index.js

  - setup: web
    build:
      base: nodejs@20
      buildCommands:
        - npm install
        - npm run build --workspace=apps/web
      deployFiles:
        - apps/web/dist/~
    run:
      base: static
```

---

## 🛠️ Local Development & Quickstart

```bash
# Install dependencies across all monorepo workspaces
npm install

# Build all TypeScript packages
npm run build

# Start the Fastify Gateway API (Port 3000)
npm run dev:api

# Start the React Vite Dashboard (Port 5173)
npm run dev:web
```

Open `http://localhost:5173` in your browser to access the 3-Panel Interactive Playground & Audit Ledger.

---

## 💻 1-Line Developer SDK Integration

### Python
```python
from openai import OpenAI

client = OpenAI(
    api_key="sk-proj-...",
    base_url="http://localhost:3000/v1"  # PrivacyShield Gateway
)

response = client.chat.completions.create(
    model="gpt-4o",
    messages=[
        {"role": "user", "content": "Patient Jane Doe (SSN: 123-45-6789) paid using card 4111-2222-3333-4444."}
    ]
)
```

### Node.js / TypeScript
```typescript
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: 'http://localhost:3000/v1',
});
```

---

## 📄 License
Licensed under the MIT License.
