/**
 * Configuration UI Manager for Chat With Cat
 * 
 * This script handles the setup page functionality including:
 * - Provider selection and UI updates
 * - API key and model configuration
 * - Storage of user preferences
 * - Status message display
 */

document.addEventListener('DOMContentLoaded', function() {
  const providerSelect = document.getElementById('provider-select');
  const modelInput = document.getElementById('model-input');
  const saveBtn = document.getElementById('save-btn');
  const apiKeyInput = document.getElementById('api-key');
  const statusMessage = document.getElementById('status-message');
  const apiKeySection = document.querySelector('.api-key-section');
  const modelInputSection = document.querySelector('.model-input-section');

  providerSelect.addEventListener('change', function() {
    const provider = providerSelect.value;
    document.querySelectorAll('.provider-setup').forEach(el => {
      el.style.display = 'none';
    });
    const setupElement = document.getElementById(`${provider}-setup`);
    if (setupElement) {
      setupElement.style.display = 'block';
    }
    apiKeySection.classList.remove('hidden');
    modelInputSection.style.display = 'block';
    updateModelPlaceholder(provider);
    loadProviderConfig(provider);
  });

  function updateModelPlaceholder(provider) {
    const placeholders = {
      gemini: 'e.g., gemini-1.5-flash',
      groq: 'e.g., mistral-saba-24b'
    };
    modelInput.placeholder = placeholders[provider] || '';
  }

  function loadProviderConfig(provider) {
    chrome.storage.local.get(['apiConfig'], function(data) {
      const config = data.apiConfig?.[provider] || {};
      apiKeyInput.value = config.apiKey || '';
      modelInput.value = config.selectedModel || '';
    });
  }

  saveBtn.addEventListener('click', function() {
    const provider = providerSelect.value;
    const apiKey = apiKeyInput.value.trim();
    const selectedModel = modelInput.value.trim();

    if (!provider || !apiKey || !selectedModel) {
      showStatus('All fields are required', 'error');
      return;
    }

    chrome.storage.local.get(['apiConfig'], function(data) {
      const apiConfig = data.apiConfig || {};
      apiConfig[provider] = { apiKey, selectedModel };
      chrome.storage.local.set({ apiConfig, activeProvider: provider }, function() {
        showStatus('Configuration saved successfully!', 'success');
      });
    });
  });

  function showStatus(message, type) {
    statusMessage.textContent = message;
    statusMessage.className = `status ${type}`;
    statusMessage.style.display = 'block';
    setTimeout(() => {
      statusMessage.style.display = 'none';
    }, 5000);
  }

  chrome.storage.local.get(['apiConfig', 'activeProvider'], function(data) {
    if (data.activeProvider) {
      providerSelect.value = data.activeProvider;
      providerSelect.dispatchEvent(new Event('change'));
    }
  });
});