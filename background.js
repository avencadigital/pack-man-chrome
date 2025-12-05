class BackgroundService {
  constructor() {
    this.cache = new Map();
    this.errorCache = new Map(); // Cache for error results to avoid repeated failed requests
    this.cacheExpiry = 5 * 60 * 1000; // 5 minutes for successful results
    this.errorCacheExpiry = 2 * 60 * 1000; // 2 minutes for errors (shorter)
    this.maxCacheSize = 100; // Limit cache size to prevent memory issues
    // Default API endpoint
    this.defaultApiEndpoint = 'https://pack-man.tech/api/analyze-packages';
    this.packManApiEndpoint = this.defaultApiEndpoint;
    this.githubApiBase = 'https://api.github.com';
    this.supportedFiles = ['package.json', 'requirements.txt', 'pubspec.yaml'];
    this.requestTimeout = 10000; // 10s timeout for all network requests
    this.retryAttempts = 2; // Retry fetches that fail due to transient issues
    this.retryDelay = 1000; // Delay between retries (ms)
    this.init();
  }

  async init() {
    // Load custom API endpoint from storage
    await this.loadApiEndpoint();

    // Configure message listeners
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      this.handleMessage(request, sender, sendResponse);
      return true; // Keep channel open for async response
    });

    // Listen for extension install/update to ensure service worker is ready
    chrome.runtime.onInstalled.addListener((details) => {
      console.log('Background: Extension installed/updated:', details.reason);
    });

    // Keep service worker alive on startup
    chrome.runtime.onStartup.addListener(() => {
      console.log('Background: Service worker started');
    });

    // Clean expired cache periodically (every minute)
    setInterval(() => this.cleanCache(), 60000);
    // Clean error cache more frequently (every 30 seconds)
    setInterval(() => this.cleanErrorCache(), 30000);
    // Enforce cache size limit every 5 minutes
    setInterval(() => this.enforceCacheSizeLimit(), 5 * 60000);

    console.log('Background: Service worker initialized and ready');
  }

  /**
   * Load custom API endpoint from storage.
   */
  async loadApiEndpoint() {
    return new Promise((resolve) => {
      chrome.storage.local.get('api_endpoint', (data) => {
        if (data.api_endpoint && data.api_endpoint.trim()) {
          this.packManApiEndpoint = data.api_endpoint.trim();
          console.log('Background: Using custom API endpoint:', this.packManApiEndpoint);
        } else {
          this.packManApiEndpoint = this.defaultApiEndpoint;
          console.log('Background: Using default API endpoint:', this.packManApiEndpoint);
        }
        resolve();
      });
    });
  }

  async handleMessage(request, sender, sendResponse) {
    console.log('Background: Received message:', request);
    try {
      switch (request.action) {
        case 'analyzeRepository':
          console.log('Background: Analyzing repository:', request.repoName, 'branch:', request.branch || 'default');
          const result = await this.analyzeRepository(request.repoName, request.branch);
          console.log('Background: Analysis result:', result);
          sendResponse({ success: true, data: result });
          break;

        case 'clearCache':
          this.cache.clear();
          this.errorCache.clear();
          console.log('Background: Cache cleared (success + error caches)');
          sendResponse({ success: true });
          break;

        case 'getCacheStats':
          sendResponse({
            success: true,
            stats: {
              size: this.cache.size,
              errorSize: this.errorCache.size,
              entries: Array.from(this.cache.keys()),
              maxSize: this.maxCacheSize
            }
          });
          break;

        case 'validateToken':
          const validationResult = await this.validateToken(request.token);
          sendResponse({ success: true, data: validationResult });
          break;

        case 'getApiEndpoint':
          sendResponse({
            success: true,
            endpoint: this.packManApiEndpoint,
            isDefault: this.packManApiEndpoint === this.defaultApiEndpoint
          });
          break;

        case 'setApiEndpoint':
          await this.setApiEndpoint(request.endpoint);
          sendResponse({ success: true });
          break;

        case 'resetApiEndpoint':
          await this.setApiEndpoint(this.defaultApiEndpoint);
          sendResponse({ success: true });
          break;

        case 'validateApiEndpoint':
          const apiValidation = await this.validateApiEndpoint(request.endpoint);
          sendResponse({ success: true, data: apiValidation });
          break;

        case 'ping':
          // Lightweight ping to check if service worker is alive
          sendResponse({ success: true, alive: true });
          break;

        default:
          sendResponse({ success: false, error: 'Unknown action' });
      }
    } catch (error) {
      console.error('Background: Error in background script:', error);
      console.error('Background: Stack trace:', error.stack);
      sendResponse({ success: false, error: error.message });
    }
  }

  /**
   * Set custom API endpoint and save to storage.
   * @param {string} endpoint - API endpoint URL.
   */
  async setApiEndpoint(endpoint) {
    const trimmedEndpoint = endpoint ? endpoint.trim() : this.defaultApiEndpoint;
    this.packManApiEndpoint = trimmedEndpoint;

    return new Promise((resolve) => {
      chrome.storage.local.set({ api_endpoint: trimmedEndpoint }, () => {
        console.log('Background: API endpoint updated:', trimmedEndpoint);
        // Clear caches when API changes to avoid stale data
        this.cache.clear();
        this.errorCache.clear();
        console.log('Background: Caches cleared due to API endpoint change');
        resolve();
      });
    });
  }

  /**
   * Validate custom API endpoint by testing with a minimal request.
   * @param {string} endpoint - API endpoint URL to validate.
   * @returns {Promise<{valid: boolean, error?: string}>}
   */
  async validateApiEndpoint(endpoint) {
    if (!endpoint || !endpoint.trim()) {
      return { valid: false, error: 'Endpoint URL is required' };
    }

    // Basic URL validation
    try {
      const url = new URL(endpoint);
      if (!url.protocol.startsWith('http')) {
        return { valid: false, error: 'Only HTTP(S) protocols are supported' };
      }
    } catch (error) {
      return { valid: false, error: 'Invalid URL format' };
    }

    // Test endpoint with a minimal request
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.requestTimeout);

      const testPayload = {
        content: '{"dependencies":{"test":"1.0.0"}}',
        fileName: 'package.json'
      };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testPayload),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        // Try to parse response as JSON
        const data = await response.json();
        // Check if response has expected structure
        if (data.packages !== undefined && data.summary !== undefined) {
          return { valid: true };
        } else {
          return {
            valid: false,
            error: 'API response format is incorrect. Expected {packages, summary}.'
          };
        }
      } else {
        return {
          valid: false,
          error: `API returned status ${response.status}`
        };
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        return { valid: false, error: 'Request timeout. API is not responding.' };
      }
      return {
        valid: false,
        error: `Cannot reach API: ${error.message}`
      };
    }
  }

  /**
   * Validates GitHub token against the GitHub API.
   * @param {string} token - GitHub personal access token.
   * @returns {Promise<{valid: boolean, user?: object, error?: string}>}
   */
  async validateToken(token) {
    if (!token) {
      return { valid: false, error: 'Token not provided' };
    }
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.requestTimeout);

      const response = await fetch(`${this.githubApiBase}/user`, {
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'Pack-Man-Chrome-Extension',
          'Authorization': `Bearer ${token}`
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      const data = await response.json();
      if (response.ok) {
        console.log('Background: Token validated for user:', data.login);
        return { valid: true, user: data };
      } else {
        const errorMsg = data.message || 'Invalid token';
        console.log('Background: Token validation failed:', errorMsg);
        return { valid: false, error: errorMsg };
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        console.error('Background: Token validation timeout');
        return { valid: false, error: 'Request timeout. Please try again.' };
      }
      console.error('Background: Token validation error:', error);
      return { valid: false, error: 'Failed to connect to GitHub API' };
    }
  }

  /**
   * Analyze a GitHub repository with retries and caching.
   * @param {string} repoName - 'owner/repo'.
   * @param {string|null} branch - Branch name (optional, uses default branch if not provided).
   * @returns {Promise<object>} Analysis result.
   */
  async analyzeRepository(repoName, branch = null) {
    // Include branch in cache key for branch-specific caching
    const cacheKey = branch ? `${repoName}@${branch}` : repoName;

    // 1) Success cache
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      console.log(`Background: ✅ Using cached result for ${cacheKey}`);
      return cached;
    }

    // 2) Error cache (avoid hammering on failures)
    const cachedError = this.getFromErrorCache(cacheKey);
    if (cachedError) {
      console.log(`Background: ⚠️ Using cached error for ${cacheKey}`);
      return cachedError;
    }

    try {
      // 3) Fetch dependency file with retry logic
      const dependencyFile = await this.fetchDependencyFileWithRetry(repoName, branch);

      // 4) Call Pack-Man API
      const analysisResult = await this.callPackManAPI(dependencyFile);

      // 5) Cache result appropriately (using branch-aware cache key)
      if (analysisResult.error) {
        this.setToErrorCache(cacheKey, analysisResult);
      } else {
        this.setToCache(cacheKey, analysisResult);
      }
      return analysisResult;
    } catch (error) {
      console.error(`Background: ❌ Unexpected error analyzing ${cacheKey}:`, error);
      const errorResult = {
        hasData: false,
        error: true,
        message: 'Unexpected error occurred. Please try again.',
        packages: [],
        summary: { total: 0, upToDate: 0, outdated: 0, errors: 0 }
      };
      this.setToErrorCache(cacheKey, errorResult);
      return errorResult;
    }
  }

  /**
   * Fetch dependency file with retry attempts for transient errors.
   * @param {string} repoName
   * @param {string|null} branch - Branch name (optional).
   * @returns {Promise<object|null>}
   */
  async fetchDependencyFileWithRetry(repoName, branch = null) {
    let lastError = null;
    for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
      try {
        return await this.fetchDependencyFile(repoName, branch);
      } catch (error) {
        lastError = error;
        console.log(`Background: Retry ${attempt}/${this.retryAttempts} failed for ${repoName}`);
        if (attempt < this.retryAttempts) {
          await new Promise(r => setTimeout(r, this.retryDelay));
        }
      }
    }
    console.error(`Background: All retry attempts failed for ${repoName}`);
    return { error: lastError?.message || 'Failed to fetch dependency file', hasAuthError: false };
  }

  /**
   * Fetches dependency file from GitHub repository.
   * @param {string} repoName
   * @param {string|null} branch - Branch name (optional, uses default branch if not provided).
   * @returns {Promise<object|null>}
   */
  async fetchDependencyFile(repoName, branch = null) {
    const tokenData = await new Promise(resolve => chrome.storage.local.get('github_token', resolve));
    const token = tokenData.github_token;

    console.log('Background: Fetching dependency files for:', repoName, branch ? `(branch: ${branch})` : '(default branch)');
    console.log('Background: Token available:', !!token);
    if (token) {
      console.log('Background: Token format:', token.startsWith('ghp_') ? 'Classic' : token.startsWith('github_pat_') ? 'Fine-grained' : 'Unknown');
      console.log('Background: Token preview:', `${token.substring(0, 10)}...${token.substring(token.length - 4)}`);
    }

    const headers = {
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'Pack-Man-Chrome-Extension'
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    // Try to fetch dependency files in priority order
    let lastError = null;
    let hasAuthError = false;

    for (const fileName of this.supportedFiles) {
      try {
        console.log(`Background: Trying to fetch ${fileName} in ${repoName}${branch ? ` (branch: ${branch})` : ''}`);
        // Add ref parameter for branch-specific file fetching
        const url = branch
          ? `${this.githubApiBase}/repos/${repoName}/contents/${fileName}?ref=${encodeURIComponent(branch)}`
          : `${this.githubApiBase}/repos/${repoName}/contents/${fileName}`;
        console.log(`Background: Request URL: ${url}`);
        console.log(`Background: Request headers:`, {
          ...headers,
          Authorization: headers.Authorization ? `Bearer ${headers.Authorization.substring(7, 17)}...` : 'None'
        });

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.requestTimeout);

        const response = await fetch(url, {
          headers,
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          const data = await response.json();
          console.log(`Background: ✅ File ${fileName} found in ${repoName}`);
          return {
            content: atob(data.content),
            fileName: fileName
          };
        } else if (response.status === 404) {
          console.log(`Background: File ${fileName} does not exist in ${repoName}`);
          // Check if it's a repo 404 or just file 404
          if (fileName === this.supportedFiles[0]) {
            // First file, check if repo exists
            console.log(`Background: Checking if repository exists: ${this.githubApiBase}/repos/${repoName}`);
            const repoResponse = await fetch(`${this.githubApiBase}/repos/${repoName}`, { headers });
            console.log(`Background: Repository check status: ${repoResponse.status}`);

            if (repoResponse.status === 404) {
              const repoErrorData = await repoResponse.json().catch(() => ({}));
              console.log(`Background: Repository 404 details:`, repoErrorData);

              if (token) {
                lastError = 'Repository not found. It may be private and your token lacks the "repo" scope.';
                hasAuthError = true;
              } else {
                lastError = 'Repository not found or is private. Add a GitHub token with "repo" scope to access private repositories.';
              }
              console.log(`Background: ⚠️ ${lastError}`);
              break; // No point checking other files
            } else if (repoResponse.status === 200) {
              console.log(`Background: Repository exists, file ${fileName} just doesn't exist`);
            }
          }
        } else if (response.status === 403) {
          const errorData = await response.json();
          console.log(`Background: Access denied to file ${fileName} in ${repoName}`);
          console.log(`Background: Error details:`, errorData);

          if (errorData.message && errorData.message.includes('rate limit')) {
            lastError = 'GitHub API rate limit exceeded. Please wait or add a token to increase limits.';
          } else if (token) {
            lastError = 'Access denied. Your token may lack the "repo" scope for private repositories.';
            hasAuthError = true;
          } else {
            lastError = 'Access denied. This may be a private repository. Add a GitHub token with "repo" scope.';
          }
          console.log(`Background: ⚠️ ${lastError}`);
          break; // No point checking other files if we have auth issues
        } else {
          console.log(`Background: Error ${response.status} when fetching ${fileName} in ${repoName}`);
          lastError = `HTTP ${response.status} error when accessing repository`;
        }
      } catch (error) {
        if (error.name === 'AbortError') {
          console.log(`Background: Request timeout for ${fileName} in ${repoName}`);
          lastError = 'Request timeout. Please try again.';
        } else {
          console.log(`Background: Network error when fetching ${fileName} in ${repoName}:`, error);
          lastError = `Network error: ${error.message}`;
        }
      }
    }

    // Return null with appropriate error message
    if (lastError) {
      console.log(`Background: ❌ Failed to fetch dependency files: ${lastError}`);
      return { error: lastError, hasAuthError };
    }

    console.log(`Background: No dependency file found in ${repoName}`);
    return null;
  }

  /**
   * Calls Pack-Man API to analyze dependency file.
   * @param {object|null} dependencyFile
   * @returns {Promise<object>}
   */
  async callPackManAPI(dependencyFile) {
    if (!dependencyFile) {
      return {
        hasData: false,
        message: 'No dependency files found',
        packages: [],
        summary: { total: 0, upToDate: 0, outdated: 0, errors: 0 }
      };
    }

    // Error bubbled from fetchDependencyFile
    if (dependencyFile.error) {
      return {
        hasData: false,
        error: true,
        hasAuthError: dependencyFile.hasAuthError,
        message: dependencyFile.error,
        packages: [],
        summary: { total: 0, upToDate: 0, outdated: 0, errors: 0 }
      };
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.requestTimeout);

      const response = await fetch(this.packManApiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: dependencyFile.content,
          fileName: dependencyFile.fileName
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        console.error(`Background: Pack-Man API error ${response.status}:`, errorText);
        throw new Error(`Pack-Man API request failed: ${response.status}`);
      }

      const result = await response.json();
      console.log('Background: ✅ Pack-Man API analysis successful');
      return {
        hasData: true,
        packages: result.packages || [],
        summary: result.summary || { total: 0, upToDate: 0, outdated: 0, errors: 0 },
        fileName: dependencyFile.fileName
      };
    } catch (error) {
      if (error.name === 'AbortError') {
        console.error('Background: Pack-Man API timeout');
        return {
          error: true,
          message: 'Pack-Man API timeout. Please try again.',
          packages: [],
          summary: { total: 0, upToDate: 0, outdated: 0, errors: 0 }
        };
      }
      console.error('Background: Error calling Pack-Man API:', error);
      return {
        error: true,
        message: `Pack-Man API error: ${error.message}`,
        packages: [],
        summary: { total: 0, upToDate: 0, outdated: 0, errors: 0 }
      };
    }
  }

  // ========== Cache Management Methods ==========

  /**
   * Get success cache entry.
   * @param {string} key
   * @returns {object|null}
   */
  getFromCache(key) {
    const cached = this.cache.get(key);
    if (!cached) return null;

    if (Date.now() - cached.timestamp > this.cacheExpiry) {
      this.cache.delete(key);
      console.log(`Background: Cache expired for ${key}`);
      return null;
    }

    return cached.data;
  }

  /**
   * Set success cache entry.
   * @param {string} key
   * @param {object} data
   */
  setToCache(key, data) {
    this.cache.set(key, {
      data: data,
      timestamp: Date.now()
    });
    console.log(`Background: Cached success result for ${key}`);
  }

  /**
   * Get error cache entry (shorter TTL).
   * @param {string} key
   * @returns {object|null}
   */
  getFromErrorCache(key) {
    const cached = this.errorCache.get(key);
    if (!cached) return null;

    if (Date.now() - cached.timestamp > this.errorCacheExpiry) {
      this.errorCache.delete(key);
      console.log(`Background: Error cache expired for ${key}`);
      return null;
    }

    return cached.data;
  }

  /**
   * Set error cache entry.
   * @param {string} key
   * @param {object} data
   */
  setToErrorCache(key, data) {
    this.errorCache.set(key, {
      data: data,
      timestamp: Date.now()
    });
    console.log(`Background: Cached error result for ${key}`);
  }

  /**
   * Clean expired entries from success cache.
   */
  cleanCache() {
    const now = Date.now();
    let cleaned = 0;
    for (const [key, value] of this.cache.entries()) {
      if (now - value.timestamp > this.cacheExpiry) {
        this.cache.delete(key);
        cleaned++;
      }
    }
    if (cleaned > 0) {
      console.log(`Background: Cleaned ${cleaned} expired entries from success cache`);
    }
  }

  /**
   * Clean expired entries from error cache.
   */
  cleanErrorCache() {
    const now = Date.now();
    let cleaned = 0;
    for (const [key, value] of this.errorCache.entries()) {
      if (now - value.timestamp > this.errorCacheExpiry) {
        this.errorCache.delete(key);
        cleaned++;
      }
    }
    if (cleaned > 0) {
      console.log(`Background: Cleaned ${cleaned} expired entries from error cache`);
    }
  }

  /**
   * Enforce maximum cache size by removing oldest entries.
   */
  enforceCacheSizeLimit() {
    if (this.cache.size <= this.maxCacheSize) return;

    console.log(`Background: Cache size (${this.cache.size}) exceeds limit (${this.maxCacheSize}), trimming...`);

    const entries = Array.from(this.cache.entries()).sort((a, b) => a[1].timestamp - b[1].timestamp);
    const toRemove = this.cache.size - this.maxCacheSize;
    for (let i = 0; i < toRemove; i++) {
      this.cache.delete(entries[i][0]);
    }
    console.log(`Background: Removed ${toRemove} oldest entries from cache`);
  }
}

// Initialize the service
const backgroundService = new BackgroundService();
