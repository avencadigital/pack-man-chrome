# Pack-Man Chrome Extension - Troubleshooting Guide

## Common Issues and Solutions

### 1. Extension Stuck on "Analyzing..."

**Symptoms:**
- Badge shows "Analyzing..." indefinitely
- No results appear after waiting

**Possible Causes & Solutions:**

#### A. Background Script Not Running
1. Open Chrome DevTools (F12)
2. Go to Console tab
3. Look for errors starting with "Chrome runtime error:"
4. **Solution**: Reload the extension
   - Go to `chrome://extensions/`
   - Find "Pack-Man Repository Analyzer"
   - Click the reload icon (🔄)

#### B. API Endpoint Not Responding
1. Check browser console for network errors
2. Look for messages like "Pack-Man API timeout" or "Pack-Man API error"
3. **Solution**: 
   - Click the extension icon
   - Verify API endpoint is correct (default: `https://pack-man-sand.vercel.app/api/analyze-packages`)
   - Test with "Validate Endpoint" button

#### C. GitHub API Rate Limit
1. Check console for "rate limit exceeded" messages
2. **Solution**:
   - Add a GitHub token (increases limit from 60/hour to 5000/hour)
   - Click extension icon → Configure GitHub token
   - Generate token at https://github.com/settings/tokens
   - Required scope: `repo` (for private repos) or `public_repo` (for public only)

#### D. Repository Not Found
1. Check if repository is private
2. **Solution**:
   - Add GitHub token with `repo` scope
   - Verify token has access to the repository

### 2. No Badges Appearing

**Symptoms:**
- Extension icon shows it's active
- No badges appear on GitHub repository pages

**Solutions:**

#### Check Page Type
- Extension only works on:
  - Repository listing pages (`/repositories`, `?tab=repositories`)
  - Individual repository pages (`/owner/repo`)
- Does NOT work on:
  - Issues, Pull Requests, Settings pages
  - Organization pages (except repositories tab)

#### Verify Content Script Loaded
1. Open DevTools Console
2. Look for "Pack-Man started" message
3. If missing:
   - Reload the page
   - Check if extension is enabled
   - Verify permissions in `chrome://extensions/`

#### Check for Dependency Files
- Extension looks for: `package.json`, `requirements.txt`, `pubspec.yaml`
- If repository has none of these files, you'll see "No dependency files found"

### 3. Dark Mode Not Working

**Symptoms:**
- Components appear with light colors in dark theme

**Solutions:**
1. Verify GitHub is in dark mode (Settings → Appearance → Dark)
2. Clear browser cache
3. Reload the extension
4. Hard refresh the page (Ctrl+Shift+R / Cmd+Shift+R)

### 4. Details Section Not Expanding

**Symptoms:**
- "Show details" button doesn't work
- Clicking has no effect

**Solutions:**
1. Check browser console for JavaScript errors
2. Verify the repository has outdated packages or errors
   - Details section only appears if there are issues to show
3. Reload the page

### 5. Extension Not Loading

**Symptoms:**
- Extension icon is grayed out
- No functionality at all

**Solutions:**

#### Verify Installation
1. Go to `chrome://extensions/`
2. Ensure "Pack-Man Repository Analyzer" is listed
3. Check that it's enabled (toggle switch is ON)
4. Verify "Developer mode" is ON (top right)

#### Check Permissions
1. Click "Details" on the extension
2. Verify these permissions are granted:
   - `activeTab`
   - `storage`
   - `scripting`
3. Verify host permissions:
   - `https://github.com/*`
   - `https://api.github.com/*`
   - `https://pack-man-sand.vercel.app/*`

#### Reinstall Extension
1. Remove the extension
2. Reload from source or Chrome Web Store
3. Grant all requested permissions

## Debugging Tips

### Enable Verbose Logging

1. **Content Script Logs:**
   - Open DevTools on GitHub page
   - Console tab shows content script logs
   - Look for messages starting with "Pack-Man" or "Background:"

2. **Background Script Logs:**
   - Go to `chrome://extensions/`
   - Find "Pack-Man Repository Analyzer"
   - Click "service worker" link
   - New DevTools window opens with background logs

### Test API Manually

```bash
# Test Pack-Man API
curl -X POST https://pack-man-sand.vercel.app/api/analyze-packages \
  -H "Content-Type: application/json" \
  -d '{
    "content": "{\"dependencies\":{\"react\":\"17.0.0\"}}",
    "fileName": "package.json"
  }'
```

### Test GitHub API

```bash
# Without token (60 requests/hour)
curl https://api.github.com/repos/facebook/react/contents/package.json

# With token (5000 requests/hour)
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://api.github.com/repos/facebook/react/contents/package.json
```

## Performance Issues

### Slow Analysis

**Causes:**
- Large package.json files (100+ dependencies)
- Slow network connection
- API rate limiting

**Solutions:**
- Wait patiently (analysis can take 5-10 seconds for large files)
- Check network tab in DevTools for slow requests
- Add GitHub token to avoid rate limits

### High Memory Usage

**Causes:**
- Too many repositories analyzed
- Cache not being cleaned

**Solutions:**
1. Click extension icon
2. Click "Clear Cache"
3. Reload GitHub page

## Error Messages

### "Repository not found or is private"
- Repository doesn't exist, or
- Repository is private and you need a token with `repo` scope

### "Access denied. Your token may lack the 'repo' scope"
- Token doesn't have required permissions
- Generate new token with `repo` scope

### "GitHub API rate limit exceeded"
- You've made too many requests
- Add a token to increase limit
- Wait for rate limit to reset (shown in error message)

### "Pack-Man API timeout"
- API is slow or down
- Check https://pack-man-sand.vercel.app/
- Try again in a few minutes

### "Extension error: Could not establish connection"
- Background script crashed
- Reload extension at `chrome://extensions/`

## Still Having Issues?

1. **Check Extension Version:**
   - Go to `chrome://extensions/`
   - Verify you're on v1.3.0 or later

2. **Update Extension:**
   - Remove old version
   - Install latest version

3. **Browser Compatibility:**
   - Chrome 88+
   - Edge 88+
   - Brave (latest)

4. **Report Bug:**
   - Open browser console
   - Copy all error messages
   - Take screenshots
   - Report on GitHub issues

## Advanced Debugging

### Inspect Extension State

```javascript
// In browser console on GitHub page
chrome.storage.local.get(null, (data) => {
  console.log('Extension storage:', data);
});
```

### Clear All Extension Data

```javascript
// In browser console
chrome.storage.local.clear(() => {
  console.log('Storage cleared');
  location.reload();
});
```

### Monitor Message Passing

```javascript
// Add to content.js temporarily
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  console.log('Message received:', msg);
  return true;
});
```

---

**Last Updated:** v1.3.0 - November 26, 2025
