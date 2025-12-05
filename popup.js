class PopupManager {
  constructor() {
    this.init();
  }

  init() {
    this.loadToken();
    this.loadApiEndpoint();
    this.setupEventListeners();
    this.updateCacheStats();
  }

  async updateCacheStats() {
    try {
      const response = await chrome.runtime.sendMessage({ action: 'getCacheStats' });
      if (response && response.success) {
        document.getElementById('cache-size').textContent = response.stats.size;
      }
    } catch (error) {
      document.getElementById('cache-size').textContent = 'N/A';
    }
  }

  setupEventListeners() {
    document.getElementById('clear-btn').addEventListener('click', async () => {
      await chrome.runtime.sendMessage({ action: 'clearCache' });
      this.updateCacheStats();
    });

    document.getElementById('save-token-btn').addEventListener('click', () => this.handleSaveToken());
    document.getElementById('remove-token-btn').addEventListener('click', () => this.handleRemoveToken());
    
    document.getElementById('save-api-btn').addEventListener('click', () => this.handleSaveApiEndpoint());
    document.getElementById('reset-api-btn').addEventListener('click', () => this.handleResetApiEndpoint());
    
    document.getElementById('bmac-btn').addEventListener('click', () => this.handleBuyMeACoffee());
  }

  async handleSaveToken() {
    const tokenInput = document.getElementById('token-input');
    const saveButton = document.getElementById('save-token-btn');
    const tokenStatus = document.getElementById('token-status');
    const token = tokenInput.value.trim();

    if (!token) {
      tokenStatus.textContent = 'Please enter a token.';
      tokenStatus.style.color = 'var(--destructive)';
      return;
    }

    saveButton.disabled = true;
    saveButton.textContent = 'Validating...';
    tokenStatus.textContent = '';

    try {
      const response = await chrome.runtime.sendMessage({ action: 'validateToken', token: token });
      if (response.success && response.data.valid) {
        chrome.storage.local.set({ github_token: token }, () => {
          this.updateTokenDisplay(token);
          tokenStatus.textContent = `Valid token! Hello, ${response.data.user.login}.`;
          tokenStatus.style.color = 'green';
        });
      } else {
        throw new Error(response.data.error || 'Invalid token.');
      }
    } catch (error) {
      tokenStatus.textContent = error.message;
      tokenStatus.style.color = 'var(--destructive)';
    } finally {
      saveButton.disabled = false;
      saveButton.textContent = 'Save Token';
    }
  }

  handleRemoveToken() {
    chrome.storage.local.remove('github_token', () => {
      this.updateTokenDisplay(null);
      const tokenStatus = document.getElementById('token-status');
      tokenStatus.textContent = 'Token removed.';
      tokenStatus.style.color = 'green';
      setTimeout(() => tokenStatus.textContent = '', 3000);
    });
  }

  updateTokenDisplay(token) {
    const tokenDisplay = document.getElementById('token-display');
    const tokenInputSection = document.getElementById('token-input-section');
    const tokenInput = document.getElementById('token-input');

    if (token) {
      document.getElementById('token-masked').textContent = 'ghp_...' + token.slice(-4);
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
      this.updateTokenDisplay(data.github_token);
    });
  }

  async loadApiEndpoint() {
    try {
      const response = await chrome.runtime.sendMessage({ action: 'getApiEndpoint' });
      if (response && response.success) {
        this.updateApiEndpointDisplay(response.endpoint, response.isDefault);
      }
    } catch (error) {
      console.error('Error loading API endpoint:', error);
    }
  }

  updateApiEndpointDisplay(endpoint, isDefault) {
    const apiInput = document.getElementById('api-endpoint-input');
    const apiStatus = document.getElementById('api-status');
    const resetBtn = document.getElementById('reset-api-btn');
    
    if (apiInput) {
      apiInput.value = endpoint;
      apiInput.placeholder = endpoint;
    }
    
    if (isDefault) {
      apiStatus.textContent = 'Using default API endpoint';
      apiStatus.style.color = 'var(--muted-foreground)';
      if (resetBtn) resetBtn.disabled = true;
    } else {
      apiStatus.textContent = 'Using custom API endpoint';
      apiStatus.style.color = 'var(--success)';
      if (resetBtn) resetBtn.disabled = false;
    }
  }

  async handleSaveApiEndpoint() {
    const apiInput = document.getElementById('api-endpoint-input');
    const saveButton = document.getElementById('save-api-btn');
    const apiStatus = document.getElementById('api-status');
    const endpoint = apiInput.value.trim();

    if (!endpoint) {
      apiStatus.textContent = 'Please enter an API endpoint.';
      apiStatus.style.color = 'var(--destructive)';
      return;
    }

    saveButton.disabled = true;
    saveButton.textContent = 'Validating...';
    apiStatus.textContent = 'Testing API endpoint...';
    apiStatus.style.color = 'var(--muted-foreground)';

    try {
      // Validate endpoint first
      const validationResponse = await chrome.runtime.sendMessage({
        action: 'validateApiEndpoint',
        endpoint: endpoint
      });

      if (validationResponse.success && validationResponse.data.valid) {
        // Save if valid
        await chrome.runtime.sendMessage({
          action: 'setApiEndpoint',
          endpoint: endpoint
        });
        
        apiStatus.textContent = 'API endpoint saved and validated successfully!';
        apiStatus.style.color = 'var(--success)';
        
        // Reload to update display
        setTimeout(() => this.loadApiEndpoint(), 1000);
      } else {
        throw new Error(validationResponse.data.error || 'API validation failed');
      }
    } catch (error) {
      apiStatus.textContent = `Error: ${error.message}`;
      apiStatus.style.color = 'var(--destructive)';
    } finally {
      saveButton.disabled = false;
      saveButton.textContent = 'Save & Test';
    }
  }

  async handleResetApiEndpoint() {
    const resetButton = document.getElementById('reset-api-btn');
    const apiStatus = document.getElementById('api-status');

    resetButton.disabled = true;
    apiStatus.textContent = 'Resetting to default...';
    apiStatus.style.color = 'var(--muted-foreground)';

    try {
      await chrome.runtime.sendMessage({ action: 'resetApiEndpoint' });
      apiStatus.textContent = 'Reset to default API endpoint';
      apiStatus.style.color = 'var(--success)';
      
      // Reload to update display
      setTimeout(() => this.loadApiEndpoint(), 500);
    } catch (error) {
      apiStatus.textContent = `Error: ${error.message}`;
      apiStatus.style.color = 'var(--destructive)';
      resetButton.disabled = false;
    }
  }

  handleBuyMeACoffee() {
    // Open Buy Me a Coffee page in new tab
    chrome.tabs.create({ url: 'https://www.buymeacoffee.com/avenca.digital' });
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new PopupManager();
});
