class GitHubRepositoryAnalyzer {
  constructor() {
    this.processedRepos = new Set();
    this.processedElements = new WeakSet();
    this.observer = null;
    this.maxRetries = 3;
    this.retryDelay = 500;
    this.isRuntimeReady = false;
    this.currentUrl = window.location.href;
    this.currentBranch = this.extractBranchFromUrl();
    this.init();
  }

  init() {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.start());
    } else {
      this.start();
    }
  }

  async start() {
    console.log('Pack-Man starting...');

    // Wait for runtime to be ready before doing anything
    await this.waitForRuntime();

    console.log('Pack-Man started');

    // Setup URL change detection for SPA navigation (branch switching)
    this.setupUrlChangeDetection();

    if (this.isIndividualRepositoryPage()) {
      this.analyzeCurrentRepository();
    } else {
      setTimeout(() => this.scanRepositories(), 1000);
      this.setupMutationObserver();
    }
  }

  /**
   * Wait for the chrome runtime (service worker) to be ready.
   * This prevents "Receiving end does not exist" errors.
   */
  async waitForRuntime() {
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        // Send a lightweight ping to wake up the service worker
        const response = await this.sendMessageWithTimeout({ action: 'ping' }, 2000);
        if (response && response.alive) {
          this.isRuntimeReady = true;
          console.log('Pack-Man: Runtime connection established');
          return true;
        }
      } catch (error) {
        console.log(`Pack-Man: Runtime not ready, attempt ${attempt}/${this.maxRetries}`);
        if (attempt < this.maxRetries) {
          await this.delay(this.retryDelay * attempt);
        }
      }
    }
    console.warn('Pack-Man: Could not establish runtime connection after retries');
    return false;
  }

  /**
   * Send a message with timeout to avoid hanging.
   */
  sendMessageWithTimeout(message, timeout = 5000) {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error('Message timeout'));
      }, timeout);

      try {
        chrome.runtime.sendMessage(message, (response) => {
          clearTimeout(timeoutId);
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            resolve(response);
          }
        });
      } catch (error) {
        clearTimeout(timeoutId);
        reject(error);
      }
    });
  }

  /**
   * Delay helper for retry logic.
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Extract branch name from URL path like /owner/repo/tree/branch-name
   * Handles complex branch names with slashes (e.g., feature/my-branch)
   */
  extractBranchFromUrl() {
    const match = window.location.pathname.match(/^\/[^/]+\/[^/]+\/tree\/(.+?)(?:\/.*)?$/);
    if (match) {
      // For paths like /owner/repo/tree/main/src/file.js, extract just the branch
      // But for /owner/repo/tree/feature/branch, we need the full branch name
      // GitHub's branch selector shows the actual branch, so we can use that as fallback
      const branchElement = document.querySelector('[data-hotkey="w"] span, .branch-name, [class*="BranchName"]');
      if (branchElement) {
        return branchElement.textContent.trim();
      }
      // Fallback: take everything after /tree/
      const fullMatch = window.location.pathname.match(/^\/[^/]+\/[^/]+\/tree\/(.+)$/);
      return fullMatch ? fullMatch[1].split('/')[0] : match[1];
    }
    return null; // null means default branch
  }

  /**
   * Setup detection for URL changes (GitHub SPA navigation)
   */
  setupUrlChangeDetection() {
    // Listen for popstate (browser back/forward)
    window.addEventListener('popstate', () => this.handleUrlChange());

    // Override pushState and replaceState to detect programmatic navigation
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;

    history.pushState = (...args) => {
      originalPushState.apply(history, args);
      this.handleUrlChange();
    };

    history.replaceState = (...args) => {
      originalReplaceState.apply(history, args);
      this.handleUrlChange();
    };

    // Also observe turbo navigation (GitHub uses Turbo)
    document.addEventListener('turbo:load', () => this.handleUrlChange());
    document.addEventListener('turbo:render', () => this.handleUrlChange());
  }

  /**
   * Handle URL changes and re-analyze if branch changed
   */
  handleUrlChange() {
    const newUrl = window.location.href;
    const newBranch = this.extractBranchFromUrl();

    // Only re-analyze if URL actually changed
    if (newUrl === this.currentUrl) return;

    console.log('Pack-Man: URL changed', { from: this.currentUrl, to: newUrl });

    const oldBranch = this.currentBranch;
    this.currentUrl = newUrl;
    this.currentBranch = newBranch;

    // Check if we're still on a repository page
    if (this.isIndividualRepositoryPage()) {
      // Re-analyze if branch changed or if we navigated to a different view
      if (oldBranch !== newBranch) {
        console.log('Pack-Man: Branch changed from', oldBranch, 'to', newBranch);
      }
      // Small delay to let GitHub finish rendering
      setTimeout(() => this.reanalyzeRepository(), 300);
    }
  }

  /**
   * Re-analyze the current repository (removes old results first)
   */
  reanalyzeRepository() {
    // Remove existing Pack-Man container
    const existingContainer = document.querySelector('.pm-root');
    if (existingContainer) {
      existingContainer.remove();
    }

    // Re-detect theme before re-analyzing (GitHub may have changed)
    detectTheme();

    // Re-analyze
    this.analyzeCurrentRepository();
  }

  isIndividualRepositoryPage() {
    const url = window.location.pathname.replace(/\/$/, ''); // Remove trailing slash
    // Match repository pages including branches: /owner/repo, /owner/repo/tree/branch
    const repoPattern = /^\/([^/]+)\/([^/]+)(\/tree\/.*)?$/;
    const match = url.match(repoPattern);

    if (!match) return false;

    const owner = match[1];
    const repo = match[2];

    // Exclude special GitHub pages that aren't repositories
    const specialOwners = ['settings', 'marketplace', 'explore', 'topics', 'trending', 'collections', 'events', 'sponsors', 'features', 'enterprise', 'pricing', 'login', 'signup', 'join', 'organizations', 'orgs', 'users', 'search', 'notifications', 'new'];
    const specialRepoPages = ['settings', 'issues', 'pulls', 'actions', 'projects', 'wiki', 'security', 'insights', 'releases', 'packages', 'pulse', 'graphs', 'network', 'community', 'compare', 'commit', 'commits', 'branches', 'tags', 'contributors', 'stargazers', 'watchers', 'forks'];

    // Check if owner is a special page
    if (specialOwners.includes(owner)) return false;

    // Check if repo is a special page (for URLs like /owner/settings)
    if (specialRepoPages.includes(repo)) return false;

    return true;
  }

  scanRepositories() {
    const repoSelectors = [
      '[data-testid="repository-list-item"]',
      '[data-testid="repo-list-item"]',
      'article[data-testid="repository-list-item"]',
      '.repo-list-item',
      '.Box-row',
      'li:has([data-hovercard-type="repository"])',
      // User profile repositories page (github.com/user?tab=repositories)
      'li.col-12.d-flex.width-full.py-4',
      'li[class*="col-12"][class*="py-4"][class*="border-bottom"]'
    ];

    let foundRepos = new Set();

    repoSelectors.forEach(selector => {
      try {
        document.querySelectorAll(selector).forEach(element => {
          if (this.isRepositoryCard(element)) foundRepos.add(element);
        });
      } catch (e) { }
    });

    foundRepos.forEach(repoCard => {
      if (this.processedElements.has(repoCard)) return;
      const repoInfo = this.extractRepositoryInfo(repoCard);
      if (!repoInfo.name || this.processedRepos.has(repoInfo.name)) return;

      this.processedElements.add(repoCard);
      this.processedRepos.add(repoInfo.name);
      this.processRepository(repoCard);
    });
  }

  isRepositoryCard(element) {
    // Check for standard repository indicators
    if (element.querySelector('a[data-hovercard-type="repository"]') ||
      element.querySelector('[itemprop="name"]') ||
      element.querySelector('h3 a[href*="/"]') ||
      (element.hasAttribute('data-testid') && element.getAttribute('data-testid').includes('repository'))) {
      return true;
    }

    // Check for user profile repositories page pattern (li with repo link)
    if (element.tagName === 'LI' && element.classList.contains('col-12')) {
      const repoLink = element.querySelector('a[href^="/"]');
      if (repoLink) {
        const href = repoLink.getAttribute('href');
        // Match /owner/repo pattern (exactly 2 path segments)
        if (href && /^\/[^/]+\/[^/]+$/.test(href)) {
          return true;
        }
      }
    }

    return false;
  }

  analyzeCurrentRepository() {
    // Extract owner/repo from URL, handling branch paths like /owner/repo/tree/branch
    const pathMatch = window.location.pathname.match(/^\/([^/]+)\/([^/]+)/);
    if (!pathMatch) return;

    const repoName = `${pathMatch[1]}/${pathMatch[2]}`;
    const targetSelectors = [
      '[data-testid="repository-description"]',
      '.repository-content .BorderGrid-cell',
      '.repository-content',
      'main'
    ];

    let targetElement = null;
    for (const selector of targetSelectors) {
      targetElement = document.querySelector(selector);
      if (targetElement) break;
    }
    if (!targetElement) return;

    let container = document.querySelector('.pm-root');
    if (!container) {
      container = document.createElement('div');
      container.className = 'pm-root';
      targetElement.insertBefore(container, targetElement.firstChild);
    }

    this.showLoading(container);
    // Pass current branch for branch-specific analysis
    this.requestAnalysis(container, repoName, this.currentBranch);
  }

  processRepository(repoCard) {
    try {
      const repoInfo = this.extractRepositoryInfo(repoCard);
      if (!repoInfo.name || repoCard.querySelector('.pm-root')) return;

      const container = this.createContainer(repoCard);
      this.showLoading(container);
      // Repository list doesn't have branch context, use default
      this.requestAnalysis(container, repoInfo.name, null);
    } catch (error) {
      console.error('Error processing repository:', error);
    }
  }

  async requestAnalysis(container, repoName, branch = null, attempt = 1) {
    try {
      const response = await this.sendMessageWithTimeout(
        { action: 'analyzeRepository', repoName, branch },
        15000
      );

      if (!response) {
        this.renderError(container, 'No response from extension');
        return;
      }

      if (response.success) {
        this.renderResults(container, response.data);
      } else {
        this.renderError(container, response.error || response.message || 'Analysis failed', response.hasAuthError);
      }
    } catch (error) {
      const isConnectionError = error.message?.includes('Receiving end does not exist') ||
        error.message?.includes('Extension context invalidated') ||
        error.message?.includes('Message timeout');

      if (isConnectionError && attempt < this.maxRetries) {
        console.log(`Pack-Man: Retrying analysis for ${repoName}, attempt ${attempt + 1}/${this.maxRetries}`);
        await this.delay(this.retryDelay * attempt);

        // Try to re-establish connection before retry
        await this.waitForRuntime();
        return this.requestAnalysis(container, repoName, branch, attempt + 1);
      }

      console.error('Pack-Man: Analysis request failed:', error.message);
      this.renderError(container, error.message || 'Extension error');
    }
  }

  extractRepositoryInfo(repoCard) {
    // Standard selectors for repository links
    const selectors = ['a[data-hovercard-type="repository"]', 'a[itemprop="name codeRepository"]', 'h3 a', '.f3 a'];
    for (const selector of selectors) {
      const link = repoCard.querySelector(selector);
      if (link?.getAttribute('href')) {
        return { name: link.getAttribute('href').replace(/^\//, '').replace(/\/$/, ''), element: repoCard };
      }
    }

    // For user profile repositories page, find the first link that matches /owner/repo pattern
    if (repoCard.tagName === 'LI') {
      const links = repoCard.querySelectorAll('a[href^="/"]');
      for (const link of links) {
        const href = link.getAttribute('href');
        if (href && /^\/[^/]+\/[^/]+$/.test(href)) {
          return { name: href.replace(/^\//, ''), element: repoCard };
        }
      }
    }

    return { name: '', element: repoCard };
  }

  createContainer(repoCard) {
    const existing = repoCard.querySelector('.pm-root');
    if (existing) return existing;

    const container = document.createElement('div');
    container.className = 'pm-root';

    // Try standard selectors first
    const targetSelectors = ['.d-flex.flex-wrap', '.repo-list-description', '.f6.color-fg-muted.mt-2'];
    for (const selector of targetSelectors) {
      const target = repoCard.querySelector(selector);
      if (target) {
        target.appendChild(container);
        return container;
      }
    }

    // For user profile repositories page, find the first div child and append after description
    if (repoCard.tagName === 'LI' && repoCard.classList.contains('col-12')) {
      const firstDiv = repoCard.querySelector('div');
      if (firstDiv) {
        // Insert at the end of the first div (after repo description)
        firstDiv.appendChild(container);
        return container;
      }
    }

    // Fallback: append to the card itself
    repoCard.appendChild(container);
    return container;
  }

  // === RENDER METHODS ===

  showLoading(container) {
    container.innerHTML = `
      <div class="pm-container pm-fade-in">
        <div class="pm-loading">
          <div class="pm-spinner"></div>
          <span class="pm-loading-text">Analyzing dependencies...</span>
        </div>
      </div>
    `;
  }

  renderResults(container, data) {
    if (data.error) {
      this.renderError(container, data.message, data.hasAuthError);
      return;
    }
    if (!data.hasData) {
      this.renderNoData(container, data.message);
      return;
    }

    const { summary, packages, fileName } = data;
    const healthScore = this.getHealthScore(summary);
    const healthClass = this.getHealthClass(healthScore);
    const fileInfo = this.getFileInfo(fileName);
    const branchName = this.currentBranch;

    const outdated = packages?.filter(p => p.status === 'outdated') || [];
    const errors = packages?.filter(p => p.status === 'error') || [];
    const hasIssues = outdated.length > 0 || errors.length > 0;

    const logoLight = chrome.runtime.getURL('icons/packman_light.svg');
    const logoDark = chrome.runtime.getURL('icons/packman_dark.svg');

    container.innerHTML = `
      <div class="pm-container pm-fade-in">
        <div class="pm-header">
          <div class="pm-header-title">
            <img src="${logoLight}" alt="Pack-Man" class="pm-logo pm-logo--light">
            <img src="${logoDark}" alt="Pack-Man" class="pm-logo pm-logo--dark">
            <span>Pack-Man</span>
          </div>
        </div>
        <div class="pm-header-meta">
          <span class="pm-header-badge pm-header-badge--${fileInfo.id}">
            <span>${fileInfo.icon}</span>
            <span>${fileInfo.name}</span>
          </span>
          ${branchName ? `
            <span class="pm-header-badge pm-header-badge--branch">
              <span>📁</span>
              <span>${branchName}</span>
            </span>
          ` : ''}
        </div>

        <div class="pm-stats">
          <span class="pm-stat pm-stat--total">
            <span class="pm-stat-icon">📦</span>
            <span>${summary.total} total</span>
          </span>
          ${summary.upToDate > 0 ? `
            <span class="pm-stat pm-stat--success">
              <span class="pm-stat-icon">✅</span>
              <span>${summary.upToDate} updated</span>
            </span>
          ` : ''}
          ${summary.outdated > 0 ? `
            <span class="pm-stat pm-stat--warning">
              <span class="pm-stat-icon">⚠️</span>
              <span>${summary.outdated} outdated</span>
            </span>
          ` : ''}
          ${summary.errors > 0 ? `
            <span class="pm-stat pm-stat--danger">
              <span class="pm-stat-icon">❌</span>
              <span>${summary.errors} errors</span>
            </span>
          ` : ''}
        </div>

        ${healthScore !== null ? `
          <div class="pm-health">
            <div class="pm-health-row">
              <span class="pm-health-label">Dependency Health</span>
              <span class="pm-health-value pm-health-value--${healthClass}">${healthScore}%</span>
            </div>
            <div class="pm-health-bar">
              <div class="pm-health-fill pm-health-fill--${healthClass}" style="width: ${healthScore}%"></div>
            </div>
          </div>
        ` : ''}

        ${hasIssues ? `
          <button class="pm-toggle" type="button">
            <span class="pm-toggle-icon">▼</span>
            <span>Show ${outdated.length + errors.length} packages needing attention</span>
          </button>
          <div class="pm-details">
            ${this.renderOutdatedSection(outdated)}
            ${this.renderErrorsSection(errors)}
          </div>
        ` : ''}
      </div>
    `;

    this.setupToggle(container);
  }

  renderOutdatedSection(packages) {
    if (packages.length === 0) return '';

    return `
      <div class="pm-section">
        <div class="pm-section-header">
          <span class="pm-section-icon">⚠️</span>
          <span class="pm-section-title">Outdated Packages</span>
          <span class="pm-section-count">${packages.length}</span>
        </div>
        <ul class="pm-packages pm-packages--scrollable">
          ${packages.map(pkg => `
            <li class="pm-package">
              <span class="pm-package-name">${pkg.name}</span>
              <div class="pm-package-versions">
                <span class="pm-version pm-version--old">${pkg.currentVersion}</span>
                <span class="pm-version-arrow">→</span>
                <span class="pm-version pm-version--new">${pkg.latestVersion}</span>
              </div>
            </li>
          `).join('')}
        </ul>
      </div>
    `;
  }

  renderErrorsSection(packages) {
    if (packages.length === 0) return '';

    return `
      <div class="pm-section">
        <div class="pm-section-header">
          <span class="pm-section-icon">❌</span>
          <span class="pm-section-title">Packages with Errors</span>
          <span class="pm-section-count">${packages.length}</span>
        </div>
        <ul class="pm-packages pm-packages--scrollable">
          ${packages.map(pkg => `
            <li class="pm-package">
              <div>
                <span class="pm-package-name">${pkg.name}</span>
                <div class="pm-package-error">${pkg.error || 'Unknown error'}</div>
              </div>
            </li>
          `).join('')}
        </ul>
      </div>
    `;
  }

  renderError(container, message, hasAuthError = false) {
    const config = this.getErrorConfig(message, hasAuthError);

    container.innerHTML = `
      <div class="pm-container pm-fade-in">
        <div class="pm-error">
          <div class="pm-error-header">
            <span class="pm-error-icon">${config.icon}</span>
            <div class="pm-error-content">
              <div class="pm-error-title">${config.title}</div>
              <div class="pm-error-message">${config.message}</div>
            </div>
          </div>
          ${config.action ? `
            <div class="pm-error-actions">
              <button class="pm-btn" onclick="chrome.runtime.openOptionsPage ? chrome.runtime.openOptionsPage() : window.open(chrome.runtime.getURL('popup.html'))">
                ${config.action}
              </button>
            </div>
          ` : ''}
        </div>
      </div>
    `;
  }

  renderNoData(container, message) {
    container.innerHTML = `
      <div class="pm-container pm-fade-in">
        <div class="pm-state">
          <span class="pm-state-icon">🔎</span>
          <span class="pm-state-text">${message || 'No dependency files found'}</span>
        </div>
      </div>
    `;
  }

  // === HELPERS ===

  setupToggle(container) {
    const toggle = container.querySelector('.pm-toggle');
    const details = container.querySelector('.pm-details');
    if (!toggle || !details) return;

    toggle.addEventListener('click', () => {
      const isOpen = details.classList.toggle('is-open');
      toggle.classList.toggle('is-open', isOpen);
      toggle.querySelector('span:last-child').textContent = isOpen ? 'Hide details' : `Show details (${details.querySelectorAll('.pm-package').length} packages)`;
    });
  }

  getHealthScore(summary) {
    if (summary.total === 0) return null;
    return Math.round(((summary.upToDate * 1) + (summary.outdated * 0.5)) / summary.total * 100);
  }

  getHealthClass(score) {
    if (score >= 80) return 'good';
    if (score >= 50) return 'fair';
    return 'poor';
  }

  getFileInfo(fileName) {
    const map = {
      'package.json': {
        id: 'npm',
        name: 'npm',
        icon: '<img src="https://cdn.simpleicons.org/npm/CB3837" alt="npm" class="pm-provider-icon">'
      },
      'requirements.txt': {
        id: 'pip',
        name: 'pip',
        icon: '<img src="https://cdn.simpleicons.org/python/3776AB" alt="Python" class="pm-provider-icon">'
      },
      'pubspec.yaml': {
        id: 'pub',
        name: 'pub',
        icon: '<img src="https://cdn.simpleicons.org/dart/0175C2" alt="Dart" class="pm-provider-icon">'
      }
    };
    return map[fileName] || { id: 'unknown', name: 'unknown', icon: '📄' };
  }

  getErrorConfig(message, hasAuthError) {
    if (hasAuthError || message.includes('token') || message.includes('private')) {
      return { icon: '🔒', title: 'Authentication Required', message: 'Add a GitHub token with "repo" scope.', action: 'Configure Token' };
    }
    if (message.includes('rate limit')) {
      return { icon: '⏱️', title: 'Rate Limit Exceeded', message: 'Add a GitHub token to increase limits.', action: 'Add Token' };
    }
    if (message.includes('not found') || message.includes('404')) {
      return { icon: '🔍', title: 'Not Found', message: 'Dependency file not found.', action: null };
    }
    return { icon: '❌', title: 'Error', message: message || 'An error occurred.', action: null };
  }

  setupMutationObserver() {
    this.observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE && node.querySelectorAll('[data-testid="repository-list-item"]').length > 0) {
              setTimeout(() => this.scanRepositories(), 500);
            }
          });
        }
      });
    });

    ['[data-testid="repository-list-container"]', 'main', '[role="main"]'].forEach(selector => {
      const el = document.querySelector(selector);
      if (el) this.observer.observe(el, { childList: true, subtree: true });
    });
  }

  destroy() {
    if (this.observer) this.observer.disconnect();
    this.processedRepos.clear();
  }
}

// Theme detection - relies on GitHub's native data-color-mode attribute
function detectTheme() {
  const html = document.documentElement;
  const colorMode = html.getAttribute('data-color-mode');

  let isDark = false;

  if (colorMode === 'dark') {
    isDark = true;
  } else if (colorMode === 'light') {
    isDark = false;
  } else if (colorMode === 'auto') {
    isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  }

  document.body.classList.toggle('github-dark-mode', isDark);
  document.body.classList.toggle('github-light-mode', !isDark);
}

// Init
const analyzer = new GitHubRepositoryAnalyzer();
detectTheme();

const themeObserver = new MutationObserver(detectTheme);
themeObserver.observe(document.documentElement, {
  attributes: true,
  attributeFilter: ['data-color-mode', 'data-dark-theme', 'data-light-theme', 'data-theme']
});

window.addEventListener('beforeunload', () => {
  analyzer.destroy();
  themeObserver.disconnect();
});
