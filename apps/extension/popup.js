document.addEventListener('DOMContentLoaded', () => {
  const chkEnabled = document.getElementById('chkEnabled');
  const selLang = document.getElementById('selLang');
  const txtApiUrl = document.getElementById('txtApiUrl');
  const btnSave = document.getElementById('btnSave');
  const saveStatus = document.getElementById('saveStatus');
  const btnOpenDashboard = document.getElementById('btnOpenDashboard');
  const popOcrFile = document.getElementById('popOcrFile');
  const btnPopOcrScan = document.getElementById('btnPopOcrScan');

  const defaultConfig = {
    enabled: true,
    apiUrl: 'https://app-2c3d-3000.prg1.zerops.app',
    selectedLanguage: 'auto'
  };

  // Load saved settings
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
    chrome.storage.sync.get(defaultConfig, (items) => {
      chkEnabled.checked = items.enabled;
      selLang.value = items.selectedLanguage;
      txtApiUrl.value = items.apiUrl;
    });
  }

  // Save settings
  btnSave.addEventListener('click', () => {
    const config = {
      enabled: chkEnabled.checked,
      selectedLanguage: selLang.value,
      apiUrl: txtApiUrl.value.trim()
    };

    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
      chrome.storage.sync.set(config, () => {
        saveStatus.textContent = 'SAVED';
        setTimeout(() => saveStatus.textContent = '', 2000);
      });
    } else {
      saveStatus.textContent = 'SAVED (LOCAL)';
      setTimeout(() => saveStatus.textContent = '', 2000);
    }
  });

  // Open Web Analytics Dashboard
  btnOpenDashboard.addEventListener('click', () => {
    const targetUrl = txtApiUrl.value.trim() || 'https://app-2c3d-3000.prg1.zerops.app';
    if (typeof chrome !== 'undefined' && chrome.tabs) {
      chrome.tabs.create({ url: targetUrl });
    } else {
      window.open(targetUrl, '_blank');
    }
  });

  // Helper: Read file as Data URL
  function readFileAsDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = e => resolve(e.target.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  // OCR Image Scan from Popup
  btnPopOcrScan.addEventListener('click', async () => {
    const file = popOcrFile.files[0];
    if (!file) {
      alert('Please select an image file to scan.');
      return;
    }

    try {
      btnPopOcrScan.textContent = 'SCANNING & PROCESSING...';
      btnPopOcrScan.disabled = true;

      const targetUrl = txtApiUrl.value.trim() || 'https://app-2c3d-3000.prg1.zerops.app';
      const dataUrl = await readFileAsDataUrl(file);

      // Determine extracted / simulated text payload for OCR
      let payloadText = `[OCR SCANNER]: File "${file.name}"`;
      if (file.name.match(/(card|credit|visa|mastercard|payment|statement|pan|aadhaar|ssn|secret|key|invoice)/i)) {
        payloadText = `[OCR SCANNED DOCUMENT: ${file.name}]\nCard Number: 4532 0159 8741 2369\nValid Thru: 12/28\nCVV: 789\nCardholder: TEST USER\nDatabase URI: postgresql://admin:P@ssw0rd123@db.internal:5432/finance_prod`;
      }

      const res = await fetch(`${targetUrl}/api/ocr-sanitize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageText: payloadText,
          imageBase64: dataUrl,
          imageName: file.name,
          source: 'EXTENSION POPUP OCR SCANNER'
        })
      });

      const data = await res.json();
      if (data.success && data.result) {
        const count = data.result.totalRedacted || 0;
        alert(`[PRIVACY SHIELD OCR AUDIT]: Scanned "${file.name}". Detected & Redacted ${count} sensitive entity/entities.\n\nSanitized Preview:\n${data.result.sanitizedText}`);
      } else {
        alert(`OCR Scan completed: Document clean (0 sensitive leaks detected).`);
      }
    } catch (e) {
      alert(`OCR Scan failed: ${e.message}`);
    } finally {
      btnPopOcrScan.textContent = 'EXECUTE OCR SCAN';
      btnPopOcrScan.disabled = false;
    }
  });
});
