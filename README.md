# Smart Finder Chrome Extension

<div align="center">
  <img src="smart-finder-extension/icon128.png" alt="Smart Finder Logo" width="128" height="128">
  
  **AI-Powered Find-in-Page Tool**
  
  [![Chrome Web Store](https://img.shields.io/badge/Chrome-Web%20Store-blue?logo=google-chrome)](https://chrome.google.com/webstore)
  [![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
  [![Version](https://img.shields.io/badge/Version-1.1.0-brightgreen.svg)](https://github.com/DaneBentley/Smart-Finder/releases)
</div>

## Overview

Smart Finder revolutionizes web page searching by replacing traditional Ctrl+F with AI-powered search capabilities. Find anything on any webpage using natural language queries, intelligent pattern detection, and multi-color highlighting.

## ✨ Key Features

- **AI-Powered Search** - Ask questions in natural language using Groq Llama 3.1
- **Smart Pattern Detection** - Automatically finds emails, phone numbers, URLs, dates, and more
- **Multi-Color Highlighting** - Highlight up to 5 different search terms simultaneously
- **Lightning Fast** - Instant results with real-time highlighting
- **Privacy Focused** - Local processing for traditional searches, secure AI processing
- **Non-Intrusive UI** - Shadow DOM isolation prevents website conflicts

## Installation

### From Chrome Web Store
1. Visit the [Chrome Web Store](https://chrome.google.com/webstore)
2. Search for "Smart Finder"
3. Click "Add to Chrome"

### Manual Installation (Development)
1. Clone this repository
2. Open Chrome and go to `chrome://extensions/`
3. Enable "Developer mode"
4. Click "Load unpacked" and select the `smart-finder-extension` folder

## Quick Start

1. **Install the extension** from the Chrome Web Store
2. **Press Ctrl+F** (or Cmd+F on Mac) on any webpage
3. **Choose your search mode:**
   - **Traditional**: Free text search with highlighting
   - **Pattern**: Smart detection of emails, phones, URLs, etc.
   - **AI**: Natural language queries (requires sign-in)

## Usage Examples

### Traditional Search
```
Search: "contact"
Result: Highlights all instances of "contact" on the page
```

### Pattern Detection
```
Search: "email"
Result: Automatically finds all email addresses
```

### AI Search
```
Search: "What is the price of the premium plan?"
Result: Intelligently locates and highlights pricing information
```

## Project Structure

```
Smart-Finder/
├── smart-finder-extension/     # Chrome extension source code
│   ├── manifest.json          # Extension manifest
│   ├── background.js           # Service worker
│   ├── content.js             # Content script
│   ├── popup.html/js          # Extension popup
│   └── modules/               # Core functionality modules
├── vercel-backend/            # Backend API (Node.js/Vercel)
│   ├── api/                   # API endpoints
│   └── database-schema.sql    # Database structure
├── docs/                      # GitHub Pages documentation
│   ├── index.html            # Landing page
│   ├── privacy-policy.html   # Privacy policy
│   ├── terms-conditions.html # Terms & conditions
│   ├── help.html            # User guide
│   └── setup/               # Setup documentation
└── archive/                  # Development files and tests
```

## Development

### Prerequisites
- Node.js 18+
- Chrome browser
- Vercel account (for backend deployment)

### Local Development
1. **Clone the repository**
   ```bash
   git clone https://github.com/DaneBentley/Smart-Finder.git
   cd Smart-Finder
   ```

2. **Load extension in Chrome**
   - Open `chrome://extensions/`
   - Enable Developer mode
   - Load unpacked: `smart-finder-extension/`

3. **Backend setup** (optional for AI features)
   - See `docs/setup/SETUP_GUIDE.md` for detailed instructions

### Building for Production
```bash
# Package extension
./package-extension.sh

# Deploy backend
cd vercel-backend && vercel deploy --prod
```

## Documentation

- **[User Guide](https://danebentley.github.io/Smart-Finder/help.html)** - Complete usage instructions
- **[Setup Guide](docs/setup/SETUP_GUIDE.md)** - Development environment setup
- **[API Documentation](docs/setup/AI_SETUP_GUIDE.md)** - Backend API setup
- **[Privacy Policy](https://danebentley.github.io/Smart-Finder/privacy-policy.html)** - Data handling practices

## Privacy & Security

- **Local Processing** - Traditional searches never leave your device
- **Secure AI** - AI searches use encrypted connections with no permanent storage
- **No Tracking** - We don't track your browsing or store personal data
- **Open Source** - Full transparency with public source code

## Contributing

We welcome contributions! Please see our [Contributing Guidelines](CONTRIBUTING.md) for details.

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- **Groq** - Ultra-fast AI inference
- **Google Chrome** - Extension platform
- **Vercel** - Backend hosting
- **Supabase** - Database services

## Support

- **Documentation**: [Smart Finder Help](https://danebentley.github.io/Smart-Finder/help.html)
- **Issues**: [GitHub Issues](https://github.com/DaneBentley/Smart-Finder/issues)
- **Discussions**: [GitHub Discussions](https://github.com/DaneBentley/Smart-Finder/discussions)

---

<div align="center">
  <strong>Made with love for better web searching</strong>
</div> 