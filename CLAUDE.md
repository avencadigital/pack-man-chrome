# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Pack-Man Chrome Extension analyzes GitHub repositories directly in the browser, providing real-time dependency analysis and package version status. It injects visual badges into GitHub repository pages showing outdated packages, health scores, and urgency levels.

## Architecture

### Chrome Extension (Manifest V3)

**Three main components communicate via Chrome's messaging API:**

1. **background.js (Service Worker)** - `BackgroundService` class
   - Handles GitHub API calls and Pack-Man API integration
   - Manages dual-cache system (success cache: 5min TTL, error cache: 2min TTL)
   - Token validation and storage
   - Custom API endpoint configuration
   - Actions: `analyzeRepository`, `validateToken`, `clearCache`, `getCacheStats`, `setApiEndpoint`, `validateApiEndpoint`, `ping`

2. **content.js (Content Script)** - `GitHubRepositoryAnalyzer` class
   - Injected into GitHub pages matching manifest patterns
   - Detects repository cards (list view) and individual repository pages
   - Handles GitHub SPA navigation (Turbo) and branch switching
   - Renders analysis results, health bars, and urgency badges
   - Uses `MutationObserver` for dynamically loaded content

3. **popup.js** - `PopupManager` class
   - Extension popup UI for token and API endpoint configuration
   - Uses `UIHelper` utility class for status messages

### Data Flow

```
GitHub Page → Content Script (detect repos) → Background (check cache)
    ↓                                              ↓
Render results ← Content Script ← Background ← GitHub API → Pack-Man API
```

### Key Files

- `manifest.json` - Extension configuration, permissions, content script patterns
- `styles.css` - All styling for injected components (`.pm-*` prefix classes)
- `popup.html` - Token/API configuration interface

## Supported Dependency Files

- `package.json` (npm)
- `requirements.txt` (pip)
- `pubspec.yaml` (pub/Dart)

## API Endpoints

- **Pack-Man API**: `https://pack-man.tech/api/analyze-packages` (default, configurable)
- **GitHub API**: `https://api.github.com`

## Urgency System

Packages are classified by urgency level (critical > high > medium > low > none):
- **Critical**: 3+ major versions behind or deprecated
- **High**: 2 major versions behind or has breaking changes
- **Medium**: 1 major behind or 5+ minors behind
- **Low**: Minor/patch updates only

## Development

### Loading the Extension

1. Open `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked" and select this folder

### Debugging

- **Background script logs**: `chrome://extensions/` → Pack-Man → "service worker" link
- **Content script logs**: DevTools console on any GitHub page
- **Popup logs**: Right-click extension icon → Inspect popup

### Key Selectors for GitHub DOM

Repository detection uses multiple selector strategies due to GitHub's varying layouts:
- `[data-testid="repository-list-item"]` - New GitHub layout
- `.Box-row` - Fallback for repo lists
- `li.col-12.d-flex.width-full.py-4` - User profile repositories page

### Cache Management

- Success results: 5-minute TTL, max 100 entries
- Error results: 2-minute TTL (shorter to allow retry)
- Cache keys include branch for branch-specific analysis: `owner/repo@branch`

## CSS Class Conventions

All injected styles use `.pm-` prefix to avoid conflicts:
- `.pm-container` - Main wrapper
- `.pm-stat--*` - Statistics badges (success, warning, danger)
- `.pm-health-*` - Health score bar
- `.pm-package--*` - Package items by urgency level
