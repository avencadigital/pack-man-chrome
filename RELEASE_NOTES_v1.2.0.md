# Pack-Man Chrome Extension - Release Notes v1.2.0

## 🍺 Support Feature Added

### What's New

**Buy Me a Coffee Integration** - A new "Support This Project" card has been added to the extension popup, allowing users to easily support the development and maintenance of Pack-Man.

---

## 🎯 Features Added

### 1. **Buy Me a Beer Button**
A beautifully styled button that opens the Buy Me a Coffee donation page in a new browser tab.

**Visual Design:**
- Yellow background (#FFDD00) matching Buy Me a Coffee branding
- Black border and text for high contrast
- Comic Sans MS font for friendly appearance
- Beer emoji 🍺 for visual appeal
- Smooth hover animations and shadow effects
- Heart icon in the card header

**User Experience:**
- Single click opens donation page in new tab
- Non-intrusive placement at bottom of popup
- Clear messaging: "Help keep Pack-Man free and open source"
- Contextual subtitle: "Your support helps maintain and improve Pack-Man!"

---

## 📁 Files Modified

### 1. `popup.html`
**Lines 257-276**: Added CSS styles for `.button-bmac` class
- Custom styling matching Buy Me a Coffee branding
- Hover and active states with smooth transitions
- Shadow effects for depth perception

**Lines 423-442**: Added new "Support This Project" card
- Heart SVG icon in header
- Buy me a beer button with emoji
- Support message subtitle
- Full-width button layout

### 2. `popup.js`
**Line 36**: Added event listener for Buy Me a Coffee button
```javascript
document.getElementById('bmac-btn').addEventListener('click', () => this.handleBuyMeACoffee());
```

**Lines 209-212**: Implemented `handleBuyMeACoffee()` method
```javascript
handleBuyMeACoffee() {
  // Open Buy Me a Coffee page in new tab
  chrome.tabs.create({ url: 'https://www.buymeacoffee.com/avenca.digital' });
}
```

### 3. `manifest.json`
**Line 4**: Version bumped from `1.1.0` to `1.2.0`

### 4. `README.md`
**Lines 103-108**: Added Version 1.2.0 release notes
- Documented new support button feature
- Listed key features and styling details

---

## 🎨 Design Details

### Button Styling
```css
.button-bmac {
  background-color: #FFDD00;      /* Buy Me a Coffee yellow */
  color: #000000;                 /* Black text */
  border: 2px solid #000000;      /* Bold border */
  font-family: 'Comic Sans MS';   /* Friendly font */
  font-weight: 700;               /* Bold text */
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
  transition: all 0.2s ease-in-out;
}
```

### Interactive States
- **Hover**: Lighter yellow (#FFED4E), lifts up 2px, stronger shadow
- **Active**: Returns to base position, softer shadow
- **Transitions**: Smooth 0.2s animations

---

## 🔗 Integration

**Buy Me a Coffee Profile**: `https://www.buymeacoffee.com/avenca.digital`

**Button Action**: Opens profile in new browser tab using Chrome's `tabs` API

---

## 💡 Why This Matters

### For Users:
- ✅ Easy way to show appreciation
- ✅ Support open source development
- ✅ Help ensure continued updates
- ✅ Non-intrusive placement

### For Developers:
- ⭐ Sustainable funding for maintenance
- ⭐ Motivation to add new features
- ⭐ Cover hosting and infrastructure costs
- ⭐ Time investment recognition

---

## 🧪 Testing Checklist

- [x] Button renders correctly in popup
- [x] Click opens Buy Me a Coffee page in new tab
- [x] Styling matches Buy Me a Coffee branding
- [x] Hover effects work smoothly
- [x] Button is responsive and full-width
- [x] Heart icon displays correctly in header
- [x] Beer emoji renders across browsers
- [x] No console errors on button click

---

## 🚀 Upgrade Instructions

### For Users:
1. Extension will auto-update from Chrome Web Store
2. Or manually: `chrome://extensions/` > "Update"
3. Click extension icon to see new support card

### For Developers:
```bash
# Pull latest changes
git pull origin main

# Reload extension in Chrome
1. Go to chrome://extensions/
2. Find Pack-Man
3. Click reload icon
```

---

## 📊 Impact

**No Breaking Changes**: This is a purely additive feature that doesn't affect existing functionality.

**Performance**: Negligible impact - single event listener, no background processing

**Privacy**: No tracking, no analytics, just a simple link to external page

---

## 🎉 Summary

Version 1.2.0 adds a tasteful and non-intrusive way for users to support Pack-Man's development through Buy Me a Coffee. The button is beautifully styled, easy to use, and helps ensure the project's sustainability.

**Thank you to all supporters! 🍺**

---

## 📝 Next Steps

Users who appreciate Pack-Man can now:
1. Click the "Buy me a beer" button
2. Visit the Buy Me a Coffee page
3. Choose a support tier
4. Help keep the project thriving!

**Every contribution helps maintain this free and open source tool!** ❤️
