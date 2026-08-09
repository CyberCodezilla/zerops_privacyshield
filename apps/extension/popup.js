document.addEventListener('DOMContentLoaded', () => {
  const chkEnabled = document.getElementById('chkEnabled');
  const selLang = document.getElementById('selLang');
  const txtApiUrl = document.getElementById('txtApiUrl');
  const btnSave = document.getElementById('btnSave');
  const saveStatus = document.getElementById('saveStatus');

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
});
