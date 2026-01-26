// ========== UI Utilities ==========
class UIHelper {
  static showStatus(elementId, message, type = 'info') {
    const element = document.getElementById(elementId);
    if (!element) return;

    element.textContent = message;
    element.style.color = this.getStatusColor(type);
  }

  static getStatusColor(type) {
    const colors = {
      success: 'green',
      error: 'var(--destructive)',
      info: 'var(--muted-foreground)'
    };
    return colors[type] || colors.info;
  }

  static setButtonState(buttonId, disabled, text) {
    const button = document.getElementById(buttonId);
    if (!button) return;

    button.disabled = disabled;
    if (text) button.textContent = text;
  }

  static clearStatusAfterDelay(elementId, delay = 3000) {
    setTimeout(() => {
      const element = document.getElementById(elementId);
      if (element) element.textContent = '';
    }, delay);
  }
}

// ========== Main Popup Manager ==========
class PopupManager {
  constructor() {
    this.init();
  }

  init() {
    this.loadToken();
    this.loadApiEndpoint();
    this.setupEventListeners();
  }

  setupEventListeners() {
    document.getElementById('clear-btn').addEventListener('click', async () => {
      await chrome.runtime.sendMessage({ action: 'clearCache' });
    });

    document.getElementById('save-token-btn').addEventListener('click', () => this.handleSaveToken());
    document.getElementById('remove-token-btn').addEventListener('click', () => this.handleRemoveToken());
    document.getElementById('save-api-btn').addEventListener('click', () => this.handleSaveApiEndpoint());
    document.getElementById('reset-api-btn').addEventListener('click', () => this.handleResetApiEndpoint());
    document.getElementById('bmac-btn').addEventListener('click', () => this.handleBuyMeACoffee());
  }

  // ========== Token Management ==========

  async handleSaveToken() {
    const token = document.getElementById('token-input').value.trim();

    if (!token) {
      UIHelper.showStatus('token-status', 'Please enter a token.', 'error');
      return;
    }

    UIHelper.setButtonState('save-token-btn', true, 'Validating...');
    UIHelper.showStatus('token-status', '', 'info');

    try {
      const response = await chrome.runtime.sendMessage({ action: 'validateToken', token });

      if (response.success && response.data.valid) {
        // Use callback pattern (original working code)
        chrome.storage.local.set({ github_token: token }, () => {
          if (chrome.runtime.lastError) {
            console.error('Error saving token:', chrome.runtime.lastError);
            UIHelper.showStatus('token-status', 'Failed to save token', 'error');
          } else {
            this.updateTokenDisplay(token);
            UIHelper.showStatus('token-status', `Valid token! Hello, ${response.data.user.login}.`, 'success');
          }
          UIHelper.setButtonState('save-token-btn', false, 'Save Token');
        });
        return; // Exit early, callback will handle the rest
      } else {
        throw new Error(response.data.error || 'Invalid token.');
      }
    } catch (error) {
      UIHelper.showStatus('token-status', error.message, 'error');
      UIHelper.setButtonState('save-token-btn', false, 'Save Token');
    }
  }

  handleRemoveToken() {
    chrome.storage.local.remove('github_token', () => {
      this.updateTokenDisplay(null);
      UIHelper.showStatus('token-status', 'Token removed.', 'success');
      UIHelper.clearStatusAfterDelay('token-status');
    });
  }

  updateTokenDisplay(token) {
    const tokenDisplay = document.getElementById('token-display');
    const tokenInputSection = document.getElementById('token-input-section');
    const tokenInput = document.getElementById('token-input');

    if (token) {
      document.getElementById('token-masked').textContent = `ghp_...${token.slice(-4)}`;
      tokenDisplay.style.display = 'block';
      tokenInputSection.style.display = 'none';
    } else {
      tokenDisplay.style.display = 'none';
      tokenInputSection.style.display = 'block';
      if (tokenInput) tokenInput.value = '';
    }
  }

  loadToken() {
    chrome.storage.local.get('github_token', (data) => {
      if (chrome.runtime.lastError) {
        console.warn('Error loading token:', chrome.runtime.lastError);
        this.updateTokenDisplay(null);
        return;
      }
      this.updateTokenDisplay(data?.github_token);
    });
  }

  // ========== API Endpoint Management ==========

  async loadApiEndpoint() {
    try {
      const response = await chrome.runtime.sendMessage({ action: 'getApiEndpoint' });
      if (response?.success) {
        this.updateApiEndpointDisplay(response.endpoint, response.isDefault);
      }
    } catch (error) {
      console.error('Error loading API endpoint:', error);
    }
  }

  updateApiEndpointDisplay(endpoint, isDefault) {
    const apiInput = document.getElementById('api-endpoint-input');
    const resetBtn = document.getElementById('reset-api-btn');

    if (apiInput) {
      apiInput.value = endpoint;
      apiInput.placeholder = endpoint;
    }

    if (isDefault) {
      UIHelper.showStatus('api-status', 'Using default API endpoint', 'info');
      if (resetBtn) resetBtn.disabled = true;
    } else {
      UIHelper.showStatus('api-status', 'Using custom API endpoint', 'success');
      if (resetBtn) resetBtn.disabled = false;
    }
  }

  async handleSaveApiEndpoint() {
    const endpoint = document.getElementById('api-endpoint-input').value.trim();

    if (!endpoint) {
      UIHelper.showStatus('api-status', 'Please enter an API endpoint.', 'error');
      return;
    }

    UIHelper.setButtonState('save-api-btn', true, 'Validating...');
    UIHelper.showStatus('api-status', 'Testing API endpoint...', 'info');

    try {
      const validationResponse = await chrome.runtime.sendMessage({
        action: 'validateApiEndpoint',
        endpoint
      });

      if (validationResponse.success && validationResponse.data.valid) {
        await chrome.runtime.sendMessage({ action: 'setApiEndpoint', endpoint });
        UIHelper.showStatus('api-status', 'API endpoint saved and validated successfully!', 'success');
        setTimeout(() => this.loadApiEndpoint(), 1000);
      } else {
        throw new Error(validationResponse.data.error || 'API validation failed');
      }
    } catch (error) {
      UIHelper.showStatus('api-status', `Error: ${error.message}`, 'error');
    } finally {
      UIHelper.setButtonState('save-api-btn', false, 'Save & Test');
    }
  }

  async handleResetApiEndpoint() {
    UIHelper.setButtonState('reset-api-btn', true);
    UIHelper.showStatus('api-status', 'Resetting to default...', 'info');

    try {
      await chrome.runtime.sendMessage({ action: 'resetApiEndpoint' });
      UIHelper.showStatus('api-status', 'Reset to default API endpoint', 'success');
      setTimeout(() => this.loadApiEndpoint(), 500);
    } catch (error) {
      UIHelper.showStatus('api-status', `Error: ${error.message}`, 'error');
      UIHelper.setButtonState('reset-api-btn', false);
    }
  }

  // ========== External Actions ==========

  handleBuyMeACoffee() {
    chrome.tabs.create({ url: 'https://www.buymeacoffee.com/avenca.digital' });
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new PopupManager();
});
