# 🛡️ PrivacyShield — Zero-Trust Real-Time PII & Secret Redaction Gateway

> **Empowering Enterprise AI Adoption with Zero Data Leakage.**  
> PrivacyShield is a high-performance, multi-service privacy proxy deployed on **Zerops** that automatically detects, sanitizes, and redacts sensitive data (PII, credentials, high-entropy secrets, and government IDs) before it leaves the client browser or API layer.

[![Zerops Status](https://img.shields.io/badge/Zerops-ACTIVE%20%2F%20HEALTHY-10B981?style=for-the-badge&logo=zerops)](https://app-2c3d-3000.prg1.zerops.app)
[![Node.js](https://img.shields.io/badge/Node.js-v22-339933?style=for-the-badge&logo=nodedotjs)](https://nodejs.org)
[![Python](https://img.shields.io/badge/Python-v3.11-3776AB?style=for-the-badge&logo=python)](https://python.org)
[![Manifest V3](https://img.shields.io/badge/Chrome_Extension-Manifest_V3-4285F4?style=for-the-badge&logo=googlechrome)](https://developer.chrome.com/docs/extensions)
[![License](https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge)](LICENSE)

---

## 📽️ Live Demonstration & Video Overview

### 🎬 Product Walkthrough Video
[![PrivacyShield Demo Video](https://img.shields.io/badge/▶️_Watch_Demo_Video-FF0000?style=for-the-badge&logo=youtube&logoColor=white)](https://app-2c3d-3000.prg1.zerops.app)

*Click the button above to watch the full walkthrough demonstrating real-time browser intercept, Zerops microservice telemetry, OCR scanning, and native multilingual reasoning.*

### ⚡ Feature Glimpse (Real-Time Redaction in Action)
| Inbound Prompt (ChatGPT / Claude / Gemini) | PrivacyShield Intercept & Redaction |
| :--- | :--- |
| `DB: postgresql://admin:P@ssw0rd!2026@db.internal:5432/prod` | `DB: [DATABASE_URI_REDACTED]` |
| `AWS Key: AKIAIOSFODNN7EXAMPLE` | `AWS Key: [AWS_ACCESS_KEY_REDACTED]` |
| `GitHub PAT: ghp_1234567890abcdefghijklmnopqrstuvwxyz` | `GitHub PAT: [GITHUB_TOKEN_REDACTED]` |
| `Aadhaar Card: 9876 5432 1098` | `Aadhaar Card: [AADHAAR_NUMBER_REDACTED]` |
| `PAN Card: ABCDE1234F` | `PAN Card: [PAN_CARD_REDACTED]` |
| `SSN: 000-12-3456` | `SSN: [SSN_REDACTED]` |

---

## 🚀 Key Features & Architectural Highlights

- ⚡ **Tier 1 High-Speed Engine (Sub-1ms):** Node.js 22 service executing 22+ priority regex matchers and Shannon Entropy analysis ($H(X) > 3.8$) to catch raw keys, DB URIs, JWTs, and code-block hashes under 1 millisecond.
- 🧠 **Tier 2 GLiNER Zero-Shot ML Engine:** Dedicated Python 3.11 FastAPI microservice using GLiNER models (tuned at `0.22` threshold) for contextual PII (`DOCTOR_NAME`, `MEDICAL_FACILITY`, `STREET_ADDRESS`, `MEDICAL_RECORD_NUMBER`).
- 🌐 **Native Multilingual Reasoning Engine:** Injector system that preserves Hinglish/Minglish technical terms (`Database`, `Timeout`, `Server`) in Hindi/Marathi without translating redaction tokens or distorting logic.
- 🖼️ **OCR Image Scanner:** In-browser and web interface document engine extracting and sanitizing text from uploaded screenshots containing credentials or government IDs.
- 🧩 **Universal Chrome Extension (Manifest V3):** Injectable content scripts matching universal DOM selectors across ChatGPT, Claude, Gemini, Perplexity, DeepSeek, and custom chat interfaces. Includes an **Interactive Threat Alert Overlay Modal**.
- 📊 **Audit Ledger & Threat Analytics:** Compliance dashboard with risk severity scoring (0–100), origin tracking, downloadable JSON transaction certificates, and `?txId=` deep-linked synchronization.

---

## 🏗️ Zerops Cloud Architecture

PrivacyShield is deployed as a multi-service container orchestration topology on **Zerops**:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        CLIENT / EXTENSION LAYER                        │
│   (Chrome Extension / Web Dashboard - https://app-2c3d-3000...)        │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ HTTP / WebSocket Intercept
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                    ZEROPS API PROXY SERVICE (app)                      │
│   - Runtime: Node.js 22                                                │
│   - Task: Tier-1 Regex + Shannon Entropy ($H(X) > 3.8$) + Audit Log    │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ Fallback for Complex Contextual PII
                                    │ Container DNS: http://nerengine:8000
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                  ZEROPS NER ML MICROSERVICE (nerengine)                │
│   - Runtime: Python 3.11 (FastAPI + PyTorch)                           │
│   - Task: Tier-2 GLiNER Entity Extraction (Threshold: 0.22)            │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 🔌 Chrome Extension Installation & Setup

Follow these steps to load and configure the extension on Google Chrome:

### 1. Extract Extension Files
1. Download `privacy-shield-extension.zip` directly from the live web dashboard:  
   👉 **[Download Chrome Extension (.ZIP)](https://app-2c3d-3000.prg1.zerops.app/privacy-shield-extension.zip)**
2. Right-click the `.zip` file $\rightarrow$ Select **Extract All...** (or use 7-Zip: `Extract to "privacy-shield-extension\"`).

### 2. Load Unpacked in Chrome
1. Open Google Chrome and navigate to `chrome://extensions/`.
2. Enable **Developer mode** using the toggle switch in the top-right corner.
3. Click the **Load unpacked** button in the top-left corner.
4. Select the extracted `privacy-shield-extension` directory (the folder containing `manifest.json`).

### 3. Connect to Production Gateway
1. Click the **PrivacyShield** icon in your Chrome toolbar.
2. Verify the **API Base URL** points to the live Zerops gateway:  
   `https://app-2c3d-3000.prg1.zerops.app`
3. Open [ChatGPT](https://chatgpt.com) or [Claude](https://claude.ai) and test entering sensitive data!

---

## 🛠️ Zerops Deployment Guide (Infrastructure-as-Code)

PrivacyShield utilizes Zerops native YAML import specifications for zero-downtime, multi-service deployment.

### 1. `zerops.yaml` Configuration
The project root contains the unified deployment manifest:

```yaml
zerops:
  - setup: app
    build:
      base: nodejs@22
      buildCommands:
        - npm install
      deployFiles:
        - index.js
        - package.json
        - public
        - apps
        - generate-icons.js
        - create-zip.js
        - node_modules
    run:
      base: nodejs@22
      ports:
        - port: 3000
          httpSupport: true
      start: node index.js
      envVariables:
        NER_SERVICE_URL: http://nerengine:8000

  - setup: nerengine
    build:
      base: python@3.11
      buildCommands:
        - python -m venv venv
        - . venv/bin/activate
        - pip install --no-cache-dir fastapi uvicorn gliner torch
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

### 2. Import into Zerops Console
Go to [app.zerops.io](https://app.zerops.io) and click **Import Project**. Paste the following IaC wrapper payload:

```yaml
project:
  name: privacyshield

services:
  - hostname: app
    type: nodejs@22
    buildFromGit: https://github.com/CyberCodezilla/zerops_privacyshield@main
    enableSubdomainAccess: true

  - hostname: nerengine
    type: python@3.11
    buildFromGit: https://github.com/CyberCodezilla/zerops_privacyshield@main
    enableSubdomainAccess: true
```

---

## 🧪 Testing the Live API Gateway

You can test redaction directly against the live gateway using `curl`:

```bash
curl -X POST https://app-2c3d-3000.prg1.zerops.app/api/sanitize \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Database string: postgresql://admin:P@ssw0rd123@db.internal:5432/prod. AWS Key: AKIAIOSFODNN7EXAMPLE. Aadhaar: 9876 5432 1098.",
    "selectedLanguage": "auto",
    "source": "CLI TEST"
  }'
```

### Sample JSON Response
```json
{
  "success": true,
  "result": {
    "id": "tx_a8f910bc4e1290ab",
    "originalLength": 134,
    "sanitizedText": "Database string: [DATABASE_URI_REDACTED]. AWS Key: [AWS_ACCESS_KEY_REDACTED]. Aadhaar: [AADHAAR_NUMBER_REDACTED].",
    "detectedLanguage": "en",
    "totalRedacted": 3,
    "processingTimeMs": 0.22
  }
}
```

---

## 📄 License & Contact

Distributed under the **MIT License**. Developed for technical hackathon evaluation by **CyberCodezilla** (`sahil.s.rane13012007@gmail.com`).

*Deployed with ❤️ on [Zerops Cloud Platform](https://zerops.io)*
