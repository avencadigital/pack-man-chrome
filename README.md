# Pack-Man Chrome Extension

## 📦 Overview

Pack-Man Chrome Extension analyzes GitHub repositories directly in your browser, providing real-time dependency analysis and package version status.

## 🚀 Installation

### From Source (Development)

1. Clone the repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top right
4. Click "Load unpacked"
5. Select the `chrome-extension` folder from this repository

## 🔑 GitHub Token Configuration

To analyze private repositories and increase API rate limits, you need to configure a GitHub Personal Access Token.

### Creating a GitHub Token

1. Go to [GitHub Settings > Developer settings > Personal access tokens](https://github.com/settings/tokens)
2. Click "Generate new token (classic)"
3. Give your token a descriptive name (e.g., "Pack-Man Extension")
4. Select the following scopes:
   - **`repo`** - Full control of private repositories (required for private repos)
   - OR **`public_repo`** - Access to public repositories only (if you only need public repos)
5. Click "Generate token"
6. Copy the generated token (it starts with `ghp_`)

### Configuring the Token in the Extension

1. Click the Pack-Man extension icon in your browser toolbar
2. Paste your GitHub token in the input field
3. Click "Save Token"
4. The extension will validate the token and display your GitHub username if successful

## 🎯 Features

- **Automatic Repository Detection**: Analyzes repositories on GitHub pages automatically
- **Multiple Package Managers**: Supports npm (package.json), pip (requirements.txt), and pub (pubspec.yaml)
- **Visual Badges**: Shows package status with color-coded badges
- **Private Repository Support**: Works with private repositories when configured with a token
- **Advanced Cache Management**: 
  - Separate caches for success (5 min TTL) and errors (2 min TTL)
  - Automatic cache size limiting (max 100 entries)
  - Prevents repeated failed requests
- **Robust Error Handling**:
  - Request timeouts (10s)
  - Automatic retry logic (2 attempts)
  - Detailed error messages with actionable guidance

## 🔧 Troubleshooting

### "Repository not found or is private"

This error occurs when:
1. **No token configured**: Add a GitHub token to access private repositories
2. **Invalid token**: Ensure your token is valid and not expired
3. **Missing permissions**: Your token needs the `repo` scope for private repositories
4. **Repository doesn't exist**: Check if the repository URL is correct

### "Access denied" or 403 errors

Common causes:
- **Rate limit exceeded**: Without a token, you're limited to 60 requests/hour. With a token, it's 5,000/hour
- **Token lacks permissions**: Ensure your token has the `repo` scope
- **Token expired or revoked**: Generate a new token if needed

### How to Debug

1. Open Chrome DevTools (F12)
2. Go to the extension's background page:
   - Navigate to `chrome://extensions/`
   - Find Pack-Man extension
   - Click "background page" or "service worker"
3. Check the Console tab for detailed logs
4. Look for messages starting with "Background:" for debugging information

### Debug Log Indicators

- ✅ **Green checkmarks**: Successful operations
- ⚠️ **Warning signs**: Issues that need attention
- ❌ **Red X**: Errors that prevented operation
- 🔒 **Lock icon**: Authentication/permission issues

## 📊 API Rate Limits

| Type | Without Token | With Token |
|------|--------------|------------|
| Requests/hour | 60 | 5,000 |
| Recommended for | Testing only | Production use |

## 🐛 Known Issues

1. **GitHub Layout Changes**: GitHub occasionally updates their layout, which may break repository detection. We regularly update selectors to maintain compatibility.

2. **Token Format**: The extension supports both classic tokens (`ghp_`) and fine-grained tokens (`github_pat_`). However, classic tokens are recommended for better compatibility.

## 🔄 Recent Updates

### Version 1.2.0 (Latest) 🆕
- **Support Button Added**:
  - Added "Buy me a beer" button powered by Buy Me a Coffee
  - Opens donation page in new tab
  - Helps maintain and improve Pack-Man
  - Custom styled button with beer emoji 🍺

### Version 1.1.0
- **Configurable API Endpoint** (Open Source Support):
  - Users can now set custom API endpoints for self-hosted instances
  - Default: `https://pack-man-sand.vercel.app/api/analyze-packages`
  - Built-in validation tests custom endpoints before saving
  - Easy reset to default with one click
  - Automatic cache clearing when API changes
  - Perfect for organizations running private Pack-Man instances

### Version 1.0.2
- **Enhanced Cache Strategy**:
  - Added separate error cache with shorter TTL (2 minutes vs 5 minutes)
  - Implemented cache size limiting (max 100 entries)
  - Added automatic cleanup for expired entries
  - Prevents hammering failed requests
- **Improved Error Handling**:
  - Added 10-second timeout for all network requests
  - Implemented retry logic with 2 attempts and 1s delay
  - Better error detection for timeouts vs network errors
  - More descriptive error messages
- **Better Performance**:
  - Multiple cleanup intervals (cache every 1min, errors every 30s)
  - Size limit enforcement every 5 minutes
  - Optimized memory usage
- **Enhanced Logging**:
  - Added JSDoc comments for better code documentation
  - More detailed console logs for debugging
  - Clear indicators for cache hits/misses

### Version 1.0.1
- Fixed authentication header format (changed from `token` to `Bearer`)
- Improved error messages for private repository access
- Enhanced debug logging for troubleshooting
- Better visual feedback for authentication errors

## 📝 License

MIT License - See LICENSE file for details

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📧 Support

If you encounter any issues or have questions, please:
1. Check the troubleshooting section above
2. Look at the debug logs in the browser console
3. Open an issue on GitHub with:
   - Description of the problem
   - Steps to reproduce
   - Console logs (with sensitive data removed)
   - Browser version and OS
