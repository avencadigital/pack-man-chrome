# Component Showcase

## Overview

The `showcase.html` file provides a visual reference for all Pack-Man Chrome Extension components in one place. This makes it easy to:

- Preview all component states without needing to test on GitHub
- Develop and test CSS changes quickly
- Verify dark/light mode compatibility
- Document component behavior for designers and developers
- Test responsive layouts at different screen sizes

## How to Use

### Opening the Showcase

1. **Direct File Access:**
   ```bash
   # Navigate to the chrome-extension folder
   cd chrome-extension
   
   # Open in your default browser (macOS)
   open showcase.html
   
   # Open in your default browser (Windows)
   start showcase.html
   
   # Open in your default browser (Linux)
   xdg-open showcase.html
   ```

2. **Via Extension:**
   - Load the extension in Chrome
   - Navigate to `chrome-extension://[extension-id]/showcase.html`
   - Replace `[extension-id]` with your actual extension ID

3. **Local Server (Recommended for development):**
   ```bash
   # Using Python
   python -m http.server 8000
   
   # Using Node.js (http-server)
   npx http-server
   
   # Then open: http://localhost:8000/showcase.html
   ```

### Features

#### Theme Toggle
- Click the "Switch to Light/Dark Mode" button at the top
- Instantly preview all components in both themes
- Simulates GitHub's light and dark themes

#### Interactive Components
- **Toggle Button**: Click to expand/collapse details section
- **Action Buttons**: Click to see alert (non-functional in showcase)
- **Hover Effects**: Hover over badges and package items to see interactions

#### Component Categories

1. **Loading State**
   - Spinner animation
   - Loading text

2. **Success States - Badges**
   - All up-to-date (npm)
   - Mixed state (npm)
   - Python project (pip)
   - Flutter project (pub)
   - Different health scores

3. **Details Section**
   - Expanded view with outdated packages
   - Package version comparisons
   - Error package listings
   - "Show more" indicators

4. **Error States**
   - Authentication error (private repo)
   - Rate limit error
   - Timeout error
   - API connection error
   - Not found error
   - Generic error

5. **No Data State**
   - No dependency files found

6. **Component Reference**
   - HTML structure examples
   - CSS class reference

## Development Workflow

### Making CSS Changes

1. Open `showcase.html` in your browser
2. Open `styles.css` in your editor
3. Make changes to CSS
4. Refresh the browser to see updates
5. Toggle between light/dark modes to verify both themes

### Testing New Components

1. Add new component HTML to `showcase.html`
2. Add corresponding CSS to `styles.css`
3. Test in showcase before implementing in `content.js`
4. Verify responsive behavior by resizing browser window

### Responsive Testing

Test at these breakpoints:
- **Mobile**: 375px, 414px
- **Tablet**: 768px, 1024px
- **Desktop**: 1280px, 1440px, 1920px

Use browser DevTools device emulation:
1. Open DevTools (F12)
2. Click device toolbar icon (Ctrl+Shift+M)
3. Select device or enter custom dimensions

## Component Structure

### Badge Components

```html
<span class="badge badge-[type]">Content</span>
```

Types:
- `badge-file-type` - Package manager indicator
- `badge-info` - Informational (total packages)
- `badge-warning` - Outdated packages
- `badge-error` - Error packages
- `badge-success` - Up-to-date packages
- `badge-health` - Health score (with sub-classes)

### Error Components

```html
<div class="repo-analyzer-error">
  <div class="error-header">
    <span class="error-icon">Icon</span>
    <span class="error-text">Message</span>
  </div>
  <div class="repo-analyzer-help">Help text</div>
  <div class="error-actions">
    <button class="error-action-btn">Action</button>
  </div>
</div>
```

### Details Components

```html
<div class="repo-analyzer-details">
  <div class="details-section">
    <h4 class="details-title">Title</h4>
    <ul class="package-list">
      <li class="package-item">
        <div class="package-header">
          <span class="package-name">Name</span>
        </div>
        <div class="package-versions">
          <span class="version-current">1.0.0</span>
          <span class="version-arrow">→</span>
          <span class="version-latest">2.0.0</span>
        </div>
      </li>
    </ul>
  </div>
</div>
```

## Mock Data

The showcase uses realistic mock data:

### Repositories
- `user/perfect-project` - All dependencies up-to-date
- `user/active-project` - Mixed state with updates needed
- `user/python-api` - Python project with pip
- `user/flutter-app` - Flutter project with pub
- `user/legacy-project` - Many outdated packages
- `user/private-repo` - Private repository (auth error)
- `user/empty-repo` - No dependency files

### Packages
- `react` - 17.0.2 → 18.2.0
- `axios` - 0.27.2 → 1.6.2
- `lodash` - 4.17.20 → 4.17.21
- `typescript` - 4.9.5 → 5.3.3
- `webpack` - 5.75.0 → 5.89.0

## Customization

### Adding New States

1. **Add HTML Section:**
   ```html
   <div class="showcase-section">
     <h2 class="section-title">New State</h2>
     <p class="section-description">Description</p>
     <div class="component-grid">
       <!-- Your components here -->
     </div>
   </div>
   ```

2. **Add Mock Data:**
   - Create realistic repository names
   - Use appropriate package names and versions
   - Include relevant error messages

3. **Test Both Themes:**
   - Verify colors and contrast
   - Check readability
   - Ensure hover states work

### Modifying Mock Repos

Edit the `.mock-repo-card` sections:
```html
<div class="mock-repo-card">
  <div class="mock-repo-header">
    <div class="mock-repo-icon"></div>
    <span class="mock-repo-name">user/repo-name</span>
  </div>
  <p class="mock-repo-description">Description here</p>
  <!-- Component goes here -->
</div>
```

## Browser Compatibility

Tested on:
- Chrome 120+
- Edge 120+
- Firefox 120+
- Safari 17+

## Tips

1. **Use Browser DevTools:**
   - Inspect elements to see applied styles
   - Test CSS changes in real-time
   - Debug layout issues

2. **Take Screenshots:**
   - Document component states
   - Share with team for feedback
   - Track visual changes over time

3. **Test Accessibility:**
   - Use browser accessibility tools
   - Test with screen readers
   - Verify keyboard navigation

4. **Performance:**
   - Check animation smoothness
   - Verify no layout shifts
   - Test with many components

## Troubleshooting

### Styles Not Loading
- Ensure `styles.css` is in the same directory
- Check browser console for errors
- Verify file paths are correct

### Theme Toggle Not Working
- Check JavaScript console for errors
- Ensure script is at bottom of HTML
- Verify button onclick handler

### Components Look Different
- Clear browser cache
- Hard refresh (Ctrl+Shift+R)
- Check if styles.css was modified

## Future Enhancements

- [ ] Add animation showcase
- [ ] Include accessibility testing tools
- [ ] Add color contrast checker
- [ ] Export component as image
- [ ] Add code copy buttons
- [ ] Include performance metrics
- [ ] Add print stylesheet
- [ ] Create component library documentation

---

**Last Updated:** v1.3.0 - November 26, 2025
