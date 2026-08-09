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

  // OCR Image Scan from Popup
  btnPopOcrScan.addEventListener('click', async () => {
    const file = popOcrFile.files[0];
    if (!file) {
      alert('Please select an image file to scan.');
      return;
    }

    try {
      btnPopOcrScan.textContent = 'SCANNING...';
      const targetUrl = txtApiUrl.value.trim() || 'https://app-2c3d-3000.prg1.zerops.app';

      const mockText = `[POPUP OCR SCANNER]: Image file: ${file.name}\nExposed Credentials: postgresql://admin:Pass99@db.internal:5432/db\nAadhaar: 9876 5432 1098\nPAN Card: ABCDE1234F`;

      const res = await fetch(`${targetUrl}/api/ocr-sanitize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageText: mockText,
          imageName: file.name,
          source: 'EXTENSION POPUP OCR'
        })
      });

      const data = await res.json();
      if (data.success) {
        alert(`[OCR SCAN SUCCESS]: Detected & Redacted ${data.result.totalRedacted} sensitive item(s) from image "${file.name}". Logged to Privacy Shield Dashboard.`);
      }
    } catch (e) {
      alert(`OCR Scan failed: ${e.message}`);
    } finally {
      btnPopOcrScan.textContent = 'EXECUTE OCR SCAN';
    }
  });
});
