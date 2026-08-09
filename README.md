# 🛡️ PrivacyShield — Zero-Trust Real-Time PII & Secret Redaction Gateway

> **Empowering Enterprise AI Adoption with Zero Data Leakage.**  
> PrivacyShield is a high-performance, multi-service privacy proxy middleware and compliance dashboard deployed on **Zerops** that automatically detects, sanitizes, and redacts sensitive data (PII, PHI, credentials, high-entropy secrets, and government IDs) before it leaves the client browser or API layer.

[![Zerops Approved](https://img.shields.io/badge/Zerops-Deploy_Ready-6366f1)](https://zerops.io)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Compliance](https://img.shields.io/badge/Compliance-GDPR_|_HIPAA_|_PCI--DSS-10b981)](#compliance)
[![Node.js](https://img.shields.io/badge/Node.js-v22-339933?style=for-the-badge&logo=nodedotjs)](https://nodejs.org)
[![Python](https://img.shields.io/badge/Python-v3.11-3776AB?style=for-the-badge&logo=python)](https://python.org)
[![Manifest V3](https://img.shields.io/badge/Chrome_Extension-Manifest_V3-4285F4?style=for-the-badge&logo=googlechrome)](https://developer.chrome.com/docs/extensions)

---

## ⚡ Feature Glimpse (Real-Time Redaction in Action)

| Inbound Prompt (ChatGPT / Claude / Gemini) | PrivacyShield Intercept & Redaction |
| :--- | :--- |
| `DB: postgresql://admin:P@ssw0rd!2026@db.internal:5432/prod` | `DB: [DATABASE_URI_REDACTED]` |
| `AWS Key: AKIAIOSFODNN7EXAMPLE` | `AWS Key: [AWS_ACCESS_KEY_REDACTED]` |
| `GitHub PAT: ghp_1234567890abcdefghijklmnopqrstuvwxyz` | `GitHub PAT: [GITHUB_TOKEN_REDACTED]` |
| `Aadhaar Card: 9876 5432 1098` | `Aadhaar Card: [AADHAAR_NUMBER_REDACTED]` |
| `PAN Card: ABCDE1234F` | `PAN Card: [PAN_CARD_REDACTED]` |
| `SSN: 000-12-3456` | `SSN: [SSN_REDACTED]` |
| `Patient Jane Doe (MRN: 987654)` | `Patient [PHI_NAME_REDACTED_1] (MRN: [PHI_NAME_REDACTED_2])` |

### 🔐 Sanitizer Playground — Live Redaction Demo

> The 3-panel playground lets you paste raw sensitive data on the left and instantly see the sanitized & token-mapped output on the right — with language detection, entity count, and sub-millisecond processing time.

![Sanitizer Playground — Real-time PII redaction with 6 entities detected in 0.17ms (Hindi mode)](Encrypted_sensitive_data.jpeg)

---

## 🚀 Key Features & Architectural Highlights

- **Drop-In OpenAI Proxy Compatibility**: Intercepts `POST /v1/chat/completions` with full streaming (SSE) and non-streaming support.
- ⚡ **Tier 1 High-Speed Engine (Sub-1ms):** Fastify Node.js service executing 22+ priority regex matchers, in-memory Bloom filter lookups, and Shannon Entropy analysis ($H(X) > 3.8$) to catch raw keys, DB URIs, JWTs, and code-block hashes under 1 millisecond.
- 🧠 **Tier 2 GLiNER Zero-Shot ML Engine:** Dedicated Python 3.11 FastAPI microservice using GLiNER models (tuned at `0.22` threshold) for contextual PII (`DOCTOR_NAME`, `MEDICAL_FACILITY`, `STREET_ADDRESS`, `MEDICAL_RECORD_NUMBER`).
- 🌐 **Native Multilingual Reasoning Engine:** Injector system that preserves Hinglish/Minglish technical terms (`Database`, `Timeout`, `Server`) in Hindi/Marathi without translating redaction tokens or distorting logic.
- 🖼️ **OCR Image Scanner:** In-browser and web interface document engine extracting and sanitizing text from uploaded screenshots containing credentials or government IDs.
- 🧩 **Universal Chrome Extension (Manifest V3):** Injectable content scripts matching universal DOM selectors across ChatGPT, Claude, Gemini, Perplexity, DeepSeek, and custom chat interfaces. Includes an **Interactive Threat Alert Overlay Modal**.
- 📊 **Audit Ledger & Threat Analytics:** Compliance dashboard with risk severity scoring (0–100), origin tracking, downloadable JSON transaction certificates, and `?txId=` deep-linked synchronization.
- **Session State & Response Rehydration**: Isolated per-request token dictionary (`[TOKEN] -> OriginalValue`) restores sensitive data in completions while enforcing a strict **Zero-Persistence Policy** (RAM only).

---

## 📐 System Architecture & Zerops Topology

```
┌────────────────────────────────────────────────────────────────────────┐
│                        CLIENT / EXTENSION LAYER                        │
│   (Chrome Extension / React SPA Dashboard / OpenAI SDK Client)         │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ HTTP / SSE / WebSocket Intercept
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                    ZEROPS API PROXY SERVICE (api)                      │
│   - Runtime: Node.js 22 (Fastify Monorepo Service)                     │
│   - Task: Tier-1 Regex + Shannon Entropy + Bloom Filter + Audit Log    │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ Fallback for Complex Contextual PII
                                    │ Container DNS: http://nerengine:8000
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                  ZEROPS NER ML MICROSERVICE (nerengine)                │
│   - Runtime: Python 3.11 (FastAPI + PyTorch)                           │
│   - Task: Tier-2 GLiNER Entity Extraction                              │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 🔌 Chrome Extension Installation & Setup

> The PrivacyShield Chrome Extension provides real-time AI protection across ChatGPT, Claude, Gemini, Perplexity, and DeepSeek. Follow the visual guide below to get started in under 2 minutes.

![Chrome Extension Installation & Activation Guide — 6-step visual walkthrough from download to protection](How_to_use.jpeg)

### Quick Steps:

1. **Download** — Click the "Download .zip" button on the PrivacyShield dashboard.
2. **Extract** — Right-click the `.zip` file → "Extract All" to a local folder.
3. **Open Extensions** — Navigate to `chrome://extensions/` in Chrome.
4. **Developer Mode** — Toggle ON the Developer Mode switch (top-right corner).
5. **Load Unpacked** — Click "Load unpacked" and select the extracted folder containing `manifest.json`.
6. **Launch & Protect** — The shield icon appears in your toolbar. Click it to activate real-time AI protection!

### Connect to Production Gateway
- Click the **PrivacyShield** icon in your Chrome toolbar.
- Verify the **API Base URL** points to your local or Zerops gateway (`http://localhost:3000`).
- Open ChatGPT, Claude, Gemini, or DeepSeek and experience real-time redaction!

---

## 🛠️ Zerops Deployment Guide (Infrastructure-as-Code)

> PrivacyShield deploys as a multi-service stack on Zerops with a single `zerops.yaml` manifest. The screenshot below shows both the Node.js API gateway (`api:3000`) and the Python GLiNER ML microservice (`nerengine`) running in the EU Central (PRG1) region.

![Zerops Cloud Dashboard — PrivacyShield multi-service deployment with Node.js API gateway and Python NER engine](Zerops_deployment.jpeg)

### `zerops.yaml` Configuration
The project root contains the unified deployment manifest:

```yaml
zerops:
  - setup: api
    build:
      base: nodejs@22
      buildCommands:
        - npm install
        - npm run build --workspace=apps/api
      deployFiles:
        - apps/api/dist
        - apps/api/package.json
        - package.json
        - node_modules
    run:
      base: nodejs@22
      ports:
        - port: 3000
          httpSupport: true
      start: npm run start --workspace=apps/api
      envVariables:
        NER_SERVICE_URL: http://nerengine:8000

  - setup: web
    build:
      base: nodejs@22
      buildCommands:
        - npm install
        - npm run build --workspace=apps/web
      deployFiles:
        - apps/web/dist/~
    run:
      base: static

  - setup: nerengine
    build:
      base: python@3.11
      buildCommands:
        - python -m venv venv
        - . venv/bin/activate
        - pip install --no-cache-dir -r apps/ner-service/requirements.txt
      deployFiles:
        - apps/ner-service
        - venv
    run:
      base: python@3.11
      ports:
        - port: 8000
          httpSupport: true
      start: |
        . venv/bin/activate
        python -m uvicorn apps.ner-service.main:app --host 0.0.0.0 --port 8000
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

## 🧪 Testing the API Gateway

You can test redaction directly against the gateway using `curl`:

```bash
curl -X POST http://localhost:3000/api/sanitize \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Database string: postgresql://admin:P@ssw0rd123@db.internal:5432/prod. AWS Key: AKIAIOSFODNN7EXAMPLE. Aadhaar: 9876 5432 1098.",
    "selectedLanguage": "auto",
    "source": "CLI TEST"
  }'
```

---

## 📄 License & Contact

Distributed under the **MIT License**. Developed for technical evaluation by **CyberCodezilla** (`sahil.s.rane13012007@gmail.com`).

*Deployed with ❤️ on [Zerops Cloud Platform](https://zerops.io)*
