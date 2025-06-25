# Smart Finder - Firefox Add-on

AI-Powered Find-in-Page Tool for Firefox. This is the Firefox-compatible version of Smart Finder that replaces Ctrl+F with AI-powered search, pattern detection, multi-color highlighting, and more.

## Firefox Compatibility

This version has been specifically adapted for Firefox with the following changes:

### Key Differences from Chrome Version

1. **OAuth Authentication**: Uses manual OAuth flow since Firefox doesn't support `chrome.identity` API
2. **Browser APIs**: Uses `browser.*` APIs with fallback to `chrome.*` for compatibility
3. **Background Script**: Uses background script instead of service worker for better Firefox compatibility
4. **Extension ID**: Includes Firefox-specific `browser_specific_settings` in manifest

### Authentication Flow

Due to Firefox's limitations with the identity API, authentication works differently:

1. Click "Sign in with Google" in the extension popup
2. A new tab will open with Google OAuth
3. Complete the authentication process
4. Return to the extension to use AI features

## Installation

### From Firefox Add-ons Store
*Coming soon - pending review*

### Manual Installation (Developer Mode)

1. Open Firefox and navigate to `about:debugging`
2. Click "This Firefox" in the left sidebar
3. Click "Load Temporary Add-on"
4. Select the `manifest.json` file from this directory
5. The extension will be installed temporarily

### For Development

1. Clone this repository
2. Navigate to the `firefox-finder-extension` directory
3. Load as temporary add-on in Firefox developer mode
4. Make changes and reload the extension as needed

## Features

- **AI-Powered Search**: Find content using natural language queries
- **Multi-color Highlighting**: Different colors for different search terms
- **Pattern Detection**: Smart recognition of emails, URLs, dates, etc.
- **Keyboard Shortcuts**: Ctrl+F (Command+F on Mac) to toggle
- **Visual Navigation**: Click-to-jump scroll indicators
- **Search History**: Remembers your last search
- **Custom AI Prompts**: Customize how AI interprets your searches

## Usage

1. Press `Ctrl+F` (or `Cmd+F` on Mac) on any webpage
2. Type your search query
3. Toggle AI mode for intelligent search
4. Use navigation buttons or Enter/Shift+Enter to move between results
5. Click scroll indicators to jump to specific matches

## API Configuration

This extension connects to the same backend as the Chrome version:
- API Base URL: `https://findr-api-backend.vercel.app/api`
- Supports both free and paid token usage
- Secure token management with local encryption

## Browser Support

- **Minimum Firefox Version**: 109.0
- **Manifest Version**: 3 (with V2 compatibility)
- **Required Permissions**: 
  - `activeTab`: Access current webpage content
  - `scripting`: Inject content scripts
  - `storage`: Save user preferences and search history

## Security

- Local encryption of sensitive tokens
- No sensitive data logged to console
- Secure OAuth implementation
- Content Security Policy enforcement

## Development

### File Structure
```
firefox-finder-extension/
├── manifest.json          # Firefox-compatible manifest
├── background.js          # Background script (not service worker)
├── content.js            # Content script entry point
├── popup.html/js         # Extension popup interface
└── modules/              # Core functionality modules
    ├── auth-manager.js   # Firefox OAuth handling
    ├── ai-service.js     # AI search functionality
    ├── search-engine.js  # Regular search engine
    └── ...
```

### Building for Distribution

1. Test thoroughly in Firefox
2. Zip the extension directory
3. Submit to Firefox Add-ons store
4. Follow Mozilla's review guidelines

## Differences from Chrome Version

| Feature | Chrome | Firefox |
|---------|--------|---------|
| OAuth | `chrome.identity` | Manual OAuth flow |
| Background | Service Worker | Background Script |
| APIs | `chrome.*` | `browser.*` with fallback |
| Installation | Chrome Web Store | Firefox Add-ons |

## Troubleshooting

### Authentication Issues
- Ensure pop-ups are allowed for the extension
- Clear extension data and try signing in again
- Check that third-party cookies are enabled

### Search Not Working
- Refresh the page and try again
- Check if the site allows content scripts
- Verify extension has required permissions

### Performance Issues
- Reduce search frequency in settings
- Disable visual indicators on large pages
- Clear extension storage if needed

## Support

For issues specific to the Firefox version:
1. Check Firefox console for errors
2. Verify compatibility with your Firefox version
3. Report bugs with Firefox version number

## License

Same license as the main Smart Finder project.
