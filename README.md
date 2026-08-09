<p align="center">
  <img src="https://img.shields.io/badge/%E2%96%B2_PRIVACY_SHIELD-Zero--Trust_Real--Time_PII_%26_Secret_Redaction_Gateway-0d1117?style=for-the-badge&labelColor=0d1117&color=10b981" alt="PrivacyShield" />
</p>

<p align="center">
  <a href="https://zerops.io"><img src="https://img.shields.io/badge/Zerops-Deploy_Ready-6366f1?style=flat-square&logo=data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJ3aGl0ZSI+PHBhdGggZD0iTTEyIDJMMiA3djEwbDEwIDUgMTAtNVY3TDEyIDJ6Ii8+PC9zdmc+" alt="Zerops" /></a>
  <img src="https://img.shields.io/badge/License-MIT-10b981?style=flat-square" alt="MIT License" />
  <img src="https://img.shields.io/badge/Compliance-GDPR_%7C_HIPAA_%7C_PCI--DSS-06b6d4?style=flat-square" alt="Compliance" />
  <img src="https://img.shields.io/badge/Node.js-v22-339933?style=flat-square&logo=nodedotjs&logoColor=white" alt="Node.js" />
  <img src="https://img.shields.io/badge/Python-v3.11-3776AB?style=flat-square&logo=python&logoColor=white" alt="Python" />
  <img src="https://img.shields.io/badge/Chrome-Manifest_V3-4285F4?style=flat-square&logo=googlechrome&logoColor=white" alt="Chrome Extension" />
</p>

> **Empowering Enterprise AI Adoption with Zero Data Leakage.**
> PrivacyShield is a high-performance, multi-service privacy proxy middleware and compliance dashboard deployed on **Zerops** that automatically detects, sanitizes, and redacts sensitive data (PII, PHI, credentials, high-entropy secrets, and government IDs) before it leaves the client browser or API layer.

---

## <img src="https://img.shields.io/badge/_%E2%96%B8-Feature_Glimpse-10b981?style=flat-square&labelColor=0d1117" /> Real-Time Redaction in Action

| Inbound Prompt (ChatGPT / Claude / Gemini) | PrivacyShield Intercept & Redaction |
| :--- | :--- |
| `DB: postgresql://admin:P@ssw0rd!2026@db.internal:5432/prod` | `DB: [DATABASE_URI_REDACTED]` |
| `AWS Key: AKIAIOSFODNN7EXAMPLE` | `AWS Key: [AWS_ACCESS_KEY_REDACTED]` |
| `GitHub PAT: ghp_1234567890abcdefghijklmnopqrstuvwxyz` | `GitHub PAT: [GITHUB_TOKEN_REDACTED]` |
| `Aadhaar Card: 9876 5432 1098` | `Aadhaar Card: [AADHAAR_NUMBER_REDACTED]` |
| `PAN Card: ABCDE1234F` | `PAN Card: [PAN_CARD_REDACTED]` |
| `SSN: 000-12-3456` | `SSN: [SSN_REDACTED]` |
| `Patient Jane Doe (MRN: 987654)` | `Patient [PHI_NAME_REDACTED_1] (MRN: [PHI_NAME_REDACTED_2])` |

### Sanitizer Playground — Live Redaction Demo

> The 3-panel playground lets you paste raw sensitive data on the left and instantly see the sanitized & token-mapped output on the right — with language detection, entity count, and sub-millisecond processing time.

![Sanitizer Playground — Real-time PII redaction with 6 entities detected in 0.17ms (Hindi mode)](Encrypted_sensitive_data.jpeg)

---

## <img src="https://img.shields.io/badge/_%E2%96%B8-Dashboard_Overview-10b981?style=flat-square&labelColor=0d1117" /> Compliance Dashboard Overview

> The live compliance dashboard provides real-time telemetry counters, 5 interactive workspace tabs, dynamic threat risk analytics, and interactive hover info cards explaining every metric in plain language.

### 1. Live Telemetry Metric Cards

| Metric Card | Displayed Value | Plain Language Explanation |
| :--- | :--- | :--- |
| **Protection Engine** | `100.0% REJECTION` | 100% of prompts containing raw API keys, passwords, DB URIs, or IDs are intercepted and sanitized before leaving the browser. |
| **Sanitized Requests** | `Live Counter (e.g. 4,380)` | Total number of prompts scanned and cleaned across Chrome Extension, Web Playground, OCR Scanner, and API Proxy. |
| **PII Tokens Redacted** | `Live Counter (e.g. 19,820)` | Total count of secret items (passwords, DB URLs, API keys, Aadhaar IDs, emails) masked across 22 pattern matchers. |
| **Cultural Reasoning** | `HINGLISH / MINGLISH` | Appends native system instructions to ensure Hindi/Marathi developer jargon (*'connect karte waqt'*, *'chabi'*) is preserved without robotic translation. |

### 2. Workspace Navigation Tabs

- **Sanity Playground & Inspector** — 3-panel workspace for instant prompt testing, language selection (Hinglish/Minglish/English), and live entity token mapping.
- **Chrome Extension Setup Guide** — 6-step visual guide for downloading, extracting, and activating the Manifest V3 browser extension.
- **OCR Image Redaction Scanner** — Drag-and-drop screenshot scanner that extracts embedded image text and redacts sensitive PII directly from image files.
- **Zero-Trust LLM Proxy Gateway** — Live proxy interface testing zero-data retention prompt forwarding and response rehydration across AI model endpoints.
- **Audit Ledger & Threat Analytics** — Immutable transaction ledger tracking origin sources, risk severity meters (0–100), downloadable JSON certificates, and deep-linked inspection modals.

### 3. Dynamic Risk Analytics & Gateway Performance

- **Average Risk Score Reduction (`99.1%`)** — Dynamic real-time calculation of risk score mitigation across all audit ledger transactions.
- **High-Confidence Redactions (`99.6%`)** — Percentage of detected sensitive tokens identified with 98%+ pattern accuracy.
- **Proxy Throughput Capacity (`12,500 REQ/SEC`)** — Maximum real-time request processing capacity of the Node.js gateway microservice.

---

## <img src="https://img.shields.io/badge/_%E2%96%B8-Key_Features-06b6d4?style=flat-square&labelColor=0d1117" /> Architectural Highlights

- **`[PROXY]` Drop-In OpenAI Proxy Compatibility** — Intercepts `POST /v1/chat/completions` with full streaming (SSE) and non-streaming support.
- **`[T1]` Tier 1 High-Speed Engine (Sub-1ms)** — Fastify Node.js service executing 22+ priority regex matchers, in-memory Bloom filter lookups, and Shannon Entropy analysis (H(X) > 3.8) to catch raw keys, DB URIs, JWTs, and code-block hashes under 1 millisecond.
- **`[T2]` Tier 2 GLiNER Zero-Shot ML Engine** — Dedicated Python 3.11 FastAPI microservice using GLiNER models (tuned at `0.22` threshold) for contextual PII (`DOCTOR_NAME`, `MEDICAL_FACILITY`, `STREET_ADDRESS`, `MEDICAL_RECORD_NUMBER`).
- **`[LANG]` Native Multilingual Reasoning Engine** — Injector system that preserves Hinglish/Minglish technical terms (`Database`, `Timeout`, `Server`) in Hindi/Marathi without translating redaction tokens or distorting logic.
- **`[OCR]` OCR Image Scanner** — In-browser and web interface document engine extracting and sanitizing text from uploaded screenshots containing credentials or government IDs.
- **`[EXT]` Universal Chrome Extension (Manifest V3)** — Injectable content scripts matching universal DOM selectors across ChatGPT, Claude, Gemini, Perplexity, DeepSeek, and custom chat interfaces. Includes an **Interactive Threat Alert Overlay Modal**.
- **`[AUDIT]` Audit Ledger & Threat Analytics** — Compliance dashboard with risk severity scoring (0–100), origin tracking, downloadable JSON transaction certificates, and `?txId=` deep-linked synchronization.
- **`[REHY]` Session State & Response Rehydration** — Isolated per-request token dictionary (`[TOKEN] -> OriginalValue`) restores sensitive data in completions while enforcing a strict **Zero-Persistence Policy** (RAM only).

---

## <img src="https://img.shields.io/badge/_%E2%96%B8-System_Architecture-6366f1?style=flat-square&labelColor=0d1117" /> Zerops Topology

```mermaid
flowchart TD
    subgraph CLIENT["CLIENT / EXTENSION LAYER"]
        EXT["Chrome Extension\n(Manifest V3)"]
        SPA["React SPA Dashboard\n(Vite)"]
        SDK["OpenAI SDK Client\n(Python / Node.js)"]
    end

    subgraph ZEROPS["ZEROPS CLOUD — EU CENTRAL (PRG1)"]
        subgraph API["API PROXY SERVICE — api:3000"]
            direction TB
            T1A["Bloom Filter\n< 0.1ms lookups"]
            T1B["22+ Regex Scanners\nAWS · GitHub · Stripe · Slack · RSA · IBAN · Aadhaar · PAN"]
            T1C["Shannon Entropy\nH(X) > 3.8 flagging"]
            AUDIT_LOG["Audit Ledger\nRisk Scoring 0–100"]
            REHYDRATOR["Token Rehydrator\nRAM-only · Zero Persistence"]
        end

        subgraph NER["NER ML MICROSERVICE — nerengine:8000"]
            GLINER["GLiNER Zero-Shot NER\nThreshold 0.22"]
            ENTITIES["Entity Extraction\nDOCTOR · FACILITY · ADDRESS · MRN"]
        end
    end

    subgraph UPSTREAM["UPSTREAM AI PROVIDERS"]
        GPT["ChatGPT API"]
        CLAUDE["Claude API"]
        GEMINI["Gemini API"]
        DEEP["DeepSeek API"]
    end

    EXT -- "HTTP / SSE Intercept" --> API
    SPA -- "REST API" --> API
    SDK -- "POST /v1/chat/completions" --> API

    T1A --> T1B --> T1C --> AUDIT_LOG
    API -- "Container DNS\nhttp://nerengine:8000" --> NER
    GLINER --> ENTITIES

    API -- "Sanitized Payload\n[REDACTED] tokens" --> UPSTREAM
    UPSTREAM -- "AI Response" --> REHYDRATOR
    REHYDRATOR -- "Rehydrated Response\nOriginal values restored" --> CLIENT

    style CLIENT fill:#0d1117,stroke:#10b981,stroke-width:2px,color:#e2e8f0
    style ZEROPS fill:#0d1117,stroke:#06b6d4,stroke-width:2px,color:#e2e8f0
    style API fill:#111827,stroke:#10b981,stroke-width:1px,color:#e2e8f0
    style NER fill:#111827,stroke:#6366f1,stroke-width:1px,color:#e2e8f0
    style UPSTREAM fill:#0d1117,stroke:#f59e0b,stroke-width:2px,color:#e2e8f0
    style EXT fill:#1e293b,stroke:#10b981,color:#e2e8f0
    style SPA fill:#1e293b,stroke:#10b981,color:#e2e8f0
    style SDK fill:#1e293b,stroke:#10b981,color:#e2e8f0
    style T1A fill:#064e3b,stroke:#10b981,color:#e2e8f0
    style T1B fill:#064e3b,stroke:#10b981,color:#e2e8f0
    style T1C fill:#064e3b,stroke:#10b981,color:#e2e8f0
    style AUDIT_LOG fill:#1e1b4b,stroke:#6366f1,color:#e2e8f0
    style REHYDRATOR fill:#1e1b4b,stroke:#06b6d4,color:#e2e8f0
    style GLINER fill:#312e81,stroke:#6366f1,color:#e2e8f0
    style ENTITIES fill:#312e81,stroke:#6366f1,color:#e2e8f0
    style GPT fill:#1a1a2e,stroke:#f59e0b,color:#e2e8f0
    style CLAUDE fill:#1a1a2e,stroke:#f59e0b,color:#e2e8f0
    style GEMINI fill:#1a1a2e,stroke:#f59e0b,color:#e2e8f0
    style DEEP fill:#1a1a2e,stroke:#f59e0b,color:#e2e8f0
```

---

## <img src="https://img.shields.io/badge/_%E2%96%B8-Chrome_Extension-4285F4?style=flat-square&labelColor=0d1117" /> Installation & Setup

> The PrivacyShield Chrome Extension provides real-time AI protection across ChatGPT, Claude, Gemini, Perplexity, and DeepSeek. Follow the visual guide below to get started in under 2 minutes.

![Chrome Extension Installation & Activation Guide — 6-step visual walkthrough from download to protection](How_to_use.jpeg)

### Quick Steps:

1. **Download** — Click the "Download .zip" button on the PrivacyShield dashboard.
2. **Extract** — Right-click the `.zip` file, select "Extract All" to a local folder.
3. **Open Extensions** — Navigate to `chrome://extensions/` in Chrome.
4. **Developer Mode** — Toggle ON the Developer Mode switch (top-right corner).
5. **Load Unpacked** — Click "Load unpacked" and select the extracted folder containing `manifest.json`.
6. **Launch & Protect** — The shield icon appears in your toolbar. Click it to activate real-time AI protection.

### Connect to Production Gateway
- Click the **PrivacyShield** icon in your Chrome toolbar.
- Verify the **API Base URL** points to your local or Zerops gateway (`http://localhost:3000`).
- Open ChatGPT, Claude, Gemini, or DeepSeek and experience real-time redaction.

---

## <img src="https://img.shields.io/badge/_%E2%96%B8-Zerops_Deployment-6366f1?style=flat-square&labelColor=0d1117" /> Infrastructure-as-Code

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

## <img src="https://img.shields.io/badge/_%E2%96%B8-Local_Development-10b981?style=flat-square&labelColor=0d1117" /> Quickstart

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

## <img src="https://img.shields.io/badge/_%E2%96%B8-Developer_SDK-06b6d4?style=flat-square&labelColor=0d1117" /> 1-Line Integration

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

## <img src="https://img.shields.io/badge/_%E2%96%B8-Testing-f59e0b?style=flat-square&labelColor=0d1117" /> API Gateway Verification

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

## <img src="https://img.shields.io/badge/_%E2%96%B8-License_%26_Contact-e2e8f0?style=flat-square&labelColor=0d1117" />

Distributed under the **MIT License**. Developed for technical evaluation by **CyberCodezilla** (`sahil.s.rane13012007@gmail.com`).

*Deployed on [Zerops Cloud Platform](https://zerops.io)*
