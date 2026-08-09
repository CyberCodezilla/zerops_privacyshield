document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const healthStatusText = document.getElementById('healthStatusText');
  const statRequests = document.getElementById('statRequests');
  const statRedactions = document.getElementById('statRedactions');
  const statThreats = document.getElementById('statThreats');
  const telemetryLatency = document.getElementById('telemetryLatency');
  const telemetryLangBadge = document.getElementById('telemetryLangBadge');

  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');

  const selectedLang = document.getElementById('selectedLang');
  const inputText = document.getElementById('inputText');
  const inputCharCount = document.getElementById('inputCharCount');
  const outputDisplay = document.getElementById('outputDisplay');
  const redactBadge = document.getElementById('redactBadge');
  const timeBadge = document.getElementById('timeBadge');
  const detectedLangBadge = document.getElementById('detectedLangBadge');
  const langInstructionDisplay = document.getElementById('langInstructionDisplay');
  const promptInjectionBadge = document.getElementById('promptInjectionBadge');
  const tokensMapContainer = document.getElementById('tokensMapContainer');

  const btnSanitize = document.getElementById('btnSanitize');
  const btnClear = document.getElementById('btnClear');
  const btnCopy = document.getElementById('btnCopy');

  const btnPresetSupport = document.getElementById('btnPresetSupport');
  const btnPresetHindi = document.getElementById('btnPresetHindi');
  const btnPresetMarathi = document.getElementById('btnPresetMarathi');
  const btnPresetKeys = document.getElementById('btnPresetKeys');

  const ocrFileInput = document.getElementById('ocrFileInput');
  const btnScanOcr = document.getElementById('btnScanOcr');
  const ocrResults = document.getElementById('ocrResults');
  const ocrSanitizedText = document.getElementById('ocrSanitizedText');
  const ocrRedactBadge = document.getElementById('ocrRedactBadge');

  const proxyTarget = document.getElementById('proxyTarget');
  const proxyPrompt = document.getElementById('proxyPrompt');
  const btnTestProxy = document.getElementById('btnTestProxy');
  const proxyResults = document.getElementById('proxyResults');
  const proxySanitizedText = document.getElementById('proxySanitizedText');
  const proxyApiResponse = document.getElementById('proxyApiResponse');
  const proxyLangBadge = document.getElementById('proxyLangBadge');

  const ledgerTableBody = document.getElementById('ledgerTableBody');
  const btnExportLedger = document.getElementById('btnExportLedger');

  // Multi-Language & High-Sensitivity Presets
  const PRESETS = {
    support: `SYSTEM AUDIT REPORT\nCustomer incident ticket #84920\nUser: Alice Smith\nEmail: alice.smith@enterprise.org\nDirect Line: +1 (555) 349-8201\nSSN Verification Token: 987-65-4321\nStatus: Request password reset and account verification.`,
    hindi: `SYSTEM LOG (HINDI/HINGLISH INCIDENT):\nDatabase connect karte waqt timeout error aa raha hai.\nCredentials used: postgresql://admin:P@ssw0rd123@db.internal:5432/production_db\nUser email: ramesh.sharma@corp.in\nContact phone: +91 98200 12345\nKrupaya server configurations aur SQL query verify karein.`,
    marathi: `SYSTEM LOG (MARATHI/MINGLISH INCIDENT):\nDatabase connection timeout zhala ahe, server configurations tapaasa.\nConfig String: postgresql://admin:SecretPass99@db.internal:5432/finance_db\nDev Email: sunil.patil@enterprise.mr\nContact: +91 98900 54321\nAPI Key: AKIAIOSFODNN7EXAMPLE\nKrupaya connection strings aani permissions check kara.`,
    keys: `-----BEGIN RSA PRIVATE KEY-----\nMIIEowIBAAKCAQEA3f2dM1k7...EXAMPLEDUMMYKEYDATA...\n-----END RSA PRIVATE KEY-----\nDatabase URI: postgresql://admin:P@ssw0rd123@db.internal:5432/prod\nPAN Card ID: ABCDE1234F\nAadhaar Token: 9876 5432 1098\nExposed Credential: AKIAIOSFODNN7EXAMPLE\nGitHub PAT: ghp_1234567890abcdefghijklmnopqrstuvwxyz`
  };

  // Tab Navigation
  tabBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      tabBtns.forEach((b) => b.classList.remove('active'));
      tabContents.forEach((c) => c.classList.remove('active'));

      btn.classList.add('active');
      const targetTab = btn.getAttribute('data-tab');
      document.getElementById(`tab-${targetTab}`).classList.add('active');

      if (targetTab === 'ledger') {
        fetchLedger();
      }
    });
  });

  // Health Check & Telemetry
  async function checkHealth() {
    try {
      const startTime = performance.now();
      const res = await fetch('/health');
      const latency = (performance.now() - startTime).toFixed(1);
      const data = await res.json();

      telemetryLatency.textContent = `${latency} ms`;

      if (data.status === 'healthy') {
        healthStatusText.textContent = `SYSTEM HEALTHY (200 OK)`;
      } else {
        healthStatusText.textContent = `SYSTEM DEGRADED`;
      }
    } catch (e) {
      healthStatusText.textContent = `SYSTEM OFFLINE`;
    }
  }

  async function updateStats() {
    try {
      const res = await fetch('/api/stats');
      const data = await res.json();
      if (data.success) {
        statRequests.textContent = data.metrics.totalRequests.toLocaleString();
        statRedactions.textContent = data.metrics.totalRedactions.toLocaleString();
        statThreats.textContent = data.metrics.threatsBlocked.toLocaleString();
      }
    } catch (e) {}
  }

  checkHealth();
  updateStats();
  setInterval(checkHealth, 10000);

  // Input Character Count
  inputText.addEventListener('input', () => {
    inputCharCount.textContent = `${inputText.value.length} BYTES`;
  });

  // Presets Click Handlers
  btnPresetSupport.addEventListener('click', () => {
    inputText.value = PRESETS.support;
    selectedLang.value = 'auto';
    inputCharCount.textContent = `${inputText.value.length} BYTES`;
    runSanitization();
  });

  btnPresetHindi.addEventListener('click', () => {
    inputText.value = PRESETS.hindi;
    selectedLang.value = 'hi';
    inputCharCount.textContent = `${inputText.value.length} BYTES`;
    runSanitization();
  });

  btnPresetMarathi.addEventListener('click', () => {
    inputText.value = PRESETS.marathi;
    selectedLang.value = 'mr';
    inputCharCount.textContent = `${inputText.value.length} BYTES`;
    runSanitization();
  });

  btnPresetKeys.addEventListener('click', () => {
    inputText.value = PRESETS.keys;
    selectedLang.value = 'auto';
    inputCharCount.textContent = `${inputText.value.length} BYTES`;
    runSanitization();
  });

  btnClear.addEventListener('click', () => {
    inputText.value = '';
    inputCharCount.textContent = '0 BYTES';
    outputDisplay.innerHTML = '<span class="placeholder-text">Click "EXECUTE SANITIZATION" to process payload...</span>';
    redactBadge.textContent = '0 REDACTED';
    timeBadge.textContent = '0.00 MS';
    detectedLangBadge.textContent = 'LANG: EN';
    langInstructionDisplay.textContent = 'Select a prompt or language to view dynamic system prompt instructions...';
    tokensMapContainer.innerHTML = '<span class="no-data">No PII or credential tokens detected in current buffer.</span>';
  });

  // Highlight Redacted Tokens in Output HTML
  function renderHighlightedText(text) {
    if (!text) return '';
    const redactionPattern = /(\[[A-Z_]+_REDACTED\]|Bearer \[TOKEN_REDACTED\]|Bearer \[JWT_TOKEN_REDACTED\])/g;
    return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(redactionPattern, '<mark class="token-highlight emerald">$1</mark>');
  }

  // Core Sanitization Action with Language Routing
  async function runSanitization() {
    const text = inputText.value;
    if (!text.trim()) {
      outputDisplay.innerHTML = '<span class="placeholder-text">Please paste un-sanitized text payload.</span>';
      return;
    }

    try {
      btnSanitize.textContent = 'SANITIZING...';
      const res = await fetch('/api/sanitize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          text,
          selectedLanguage: selectedLang.value,
          source: 'WEB PLAYGROUND'
        })
      });
      const data = await res.json();

      if (data.success) {
        const { sanitizedText, totalRedacted, processingTimeMs, tokensMap, detectedLanguage, languageInstruction } = data.result;

        outputDisplay.innerHTML = renderHighlightedText(sanitizedText);
        redactBadge.textContent = `${totalRedacted} REDACTED`;
        timeBadge.textContent = `${processingTimeMs} MS`;

        const langName = detectedLanguage === 'hi' ? 'HINDI (हिंदी)' : (detectedLanguage === 'mr' ? 'MARATHI (मराठी)' : 'ENGLISH');
        detectedLangBadge.textContent = `LANG: ${langName}`;
        telemetryLangBadge.textContent = `${langName} DETECTED`;

        langInstructionDisplay.textContent = languageInstruction;
        promptInjectionBadge.textContent = `INJECTION: ACTIVE (${detectedLanguage.toUpperCase()})`;

        // Render Token Map Cards
        if (tokensMap && tokensMap.length > 0) {
          tokensMapContainer.innerHTML = tokensMap.map((t) => {
            const riskClass = t.risk === 'CRITICAL' ? 'badge-crimson' : (t.risk === 'HIGH' ? 'badge-amber' : 'badge-cyan');
            const fillClass = t.risk === 'CRITICAL' ? 'crimson' : (t.risk === 'HIGH' ? 'cyan' : 'green');
            return `
              <div class="token-card">
                <div class="token-card-header">
                  <span class="token-type">${t.type}</span>
                  <span class="badge ${riskClass}">${t.risk}</span>
                </div>
                <div class="confidence-bar-wrapper">
                  <div class="confidence-label-row">
                    <span>CONFIDENCE SCORE</span>
                    <span class="text-emerald">${t.confidence}%</span>
                  </div>
                  <div class="progress-bar-bg">
                    <div class="progress-bar-fill ${fillClass}" style="width: ${t.confidence}%;"></div>
                  </div>
                </div>
                <div class="token-replaced-box">MASKED TOKEN: ${t.replacement}</div>
              </div>
            `;
          }).join('');
        } else {
          tokensMapContainer.innerHTML = '<span class="no-data">Clean payload — 0 PII or secret patterns detected.</span>';
        }

        updateStats();
      }
    } catch (err) {
      outputDisplay.textContent = `Error executing sanitization: ${err.message}`;
    } finally {
      btnSanitize.innerHTML = `<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg> EXECUTE SANITIZATION`;
    }
  }

  btnSanitize.addEventListener('click', runSanitization);
  selectedLang.addEventListener('change', () => {
    if (inputText.value.trim()) runSanitization();
  });

  // OCR Image Sanitization Action
  btnScanOcr.addEventListener('click', async () => {
    const file = ocrFileInput.files[0];
    if (!file) {
      alert('Please select an image file first.');
      return;
    }

    try {
      btnScanOcr.textContent = 'SCANNING IMAGE VIA OCR...';

      // Standard OCR Simulation text extracted from credential images / screenshots
      const mockExtractedText = `SCANNED CREDENTIAL CARD (OCR OUTPUT):\nCardholder: Rajesh Kumar\nPAN Number: ABCDE9876F\nAadhaar ID: 9876 5432 1098\nEmail: rajesh.k@corp.in\nDatabase Config: postgresql://admin:Pass12345@db.internal:5432/finance_db\nPrivate Key:\n-----BEGIN RSA PRIVATE KEY-----\nMIIEowIBAAKCAQEA3f2dM1k7...EXAMPLEDUMMYKEYDATA...\n-----END RSA PRIVATE KEY-----`;

      const res = await fetch('/api/ocr-sanitize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageText: mockExtractedText,
          imageName: file.name,
          source: 'WEB OCR SCANNER'
        })
      });
      const data = await res.json();

      if (data.success) {
        ocrResults.classList.remove('hidden');
        ocrSanitizedText.innerHTML = renderHighlightedText(data.result.sanitizedText);
        ocrRedactBadge.textContent = `${data.result.totalRedacted} PII REDACTED`;
        updateStats();
      }
    } catch (e) {
      alert(`OCR Scan failed: ${e.message}`);
    } finally {
      btnScanOcr.innerHTML = `<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"></path></svg> EXECUTE OCR IMAGE SCAN`;
    }
  });

  // Copy Sanitized Payload
  btnCopy.addEventListener('click', () => {
    const rawText = outputDisplay.innerText || outputDisplay.textContent;
    if (rawText && !rawText.includes('Click "EXECUTE SANITIZATION"')) {
      navigator.clipboard.writeText(rawText);
      btnCopy.textContent = 'COPIED TO CLIPBOARD';
      setTimeout(() => {
        btnCopy.innerHTML = `<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path></svg> COPY SANITIZED PAYLOAD`;
      }, 2000);
    }
  });

  // Proxy Test Action
  btnTestProxy.addEventListener('click', async () => {
    const prompt = proxyPrompt.value;
    const targetApi = proxyTarget.value;

    try {
      btnTestProxy.textContent = 'TRANSMITTING...';
      const res = await fetch('/api/proxy-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          prompt, 
          targetApi,
          selectedLanguage: selectedLang.value,
          source: 'LLM GATEWAY PROXY'
        })
      });
      const data = await res.json();

      if (data.success) {
        proxyResults.classList.remove('hidden');
        proxySanitizedText.innerHTML = renderHighlightedText(data.sanitizedPromptSentToApi);
        proxyApiResponse.textContent = data.mockTargetApiResponse;
        proxyLangBadge.textContent = `NATURAL REHYDRATION (${data.detectedLanguage.toUpperCase()})`;
        updateStats();
      }
    } catch (err) {
      alert(`Proxy transmission error: ${err.message}`);
    } finally {
      btnTestProxy.innerHTML = `<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg> TRANSMIT THROUGH ZERO-TRUST GATEWAY`;
    }
  });

  // Audit Ledger Fetch & Table Formatting
  async function fetchLedger() {
    try {
      const res = await fetch('/api/audit-ledger');
      const data = await res.json();

      if (data.success && data.ledger.length > 0) {
        ledgerTableBody.innerHTML = data.ledger.map((item) => {
          const riskBadge = item.riskLevel === 'CRITICAL' ? 'badge-crimson' : (item.riskLevel === 'HIGH' ? 'badge-amber' : 'badge-cyan');
          const meterFill = item.riskLevel === 'CRITICAL' ? 'crimson' : (item.riskLevel === 'HIGH' ? 'cyan' : 'green');
          const langCode = (item.language || 'en').toUpperCase();
          const entityChips = item.entitiesFound.map(e => `<span class="entity-chip">${e}</span>`).join('');
          const srcBadge = item.source && item.source.includes('EXTENSION') ? 'badge-indigo' : 'badge-emerald';

          return `
            <tr>
              <td>
                <span class="tx-id-badge" onclick="navigator.clipboard.writeText('${item.id}'); alert('Copied UUID: ${item.id}');">
                  <svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path></svg>
                  ${item.id.slice(0, 18)}...
                </span>
              </td>
              <td>${new Date(item.timestamp).toLocaleTimeString()}</td>
              <td><span class="badge ${srcBadge}">${item.source || 'WEB API'}</span></td>
              <td>${entityChips}</td>
              <td><span class="badge badge-indigo">${langCode}</span></td>
              <td><span class="badge ${riskBadge}">${item.riskLevel}</span></td>
              <td>
                <div class="risk-meter-container">
                  <div class="progress-bar-bg" style="flex:1;">
                    <div class="progress-bar-fill ${meterFill}" style="width: ${item.riskScore}%;"></div>
                  </div>
                  <span style="font-size:0.72rem; font-weight:700;">${item.riskScore}</span>
                </div>
              </td>
              <td><span class="badge badge-emerald">SANITY PASSED</span></td>
            </tr>
          `;
        }).join('');
      } else {
        ledgerTableBody.innerHTML = '<tr><td colspan="8" class="text-center">No transaction records found.</td></tr>';
      }
    } catch (e) {
      ledgerTableBody.innerHTML = '<tr><td colspan="8" class="text-center text-crimson">Failed to load audit ledger.</td></tr>';
    }
  }

  btnExportLedger.addEventListener('click', async () => {
    try {
      const res = await fetch('/api/audit-ledger');
      const data = await res.json();
      const blob = new Blob([JSON.stringify(data.ledger, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `privacy-shield-audit-ledger-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert('Export failed.');
    }
  });

  // Auto-trigger initial preset
  btnPresetSupport.click();
});
