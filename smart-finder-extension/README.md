# Smart Finder Chrome Extension

A sophisticated Chrome extension that revolutionizes browser search functionality by combining traditional text matching with AI-powered natural language search capabilities. Smart Finder serves as an intelligent replacement for the standard Ctrl+F with advanced features like pattern detection, multi-term highlighting, and progressive AI search.

## 🌟 Key Features

### 🤖 **AI-Powered Search**
- **Natural Language Queries**: Search using plain English instead of exact text matching
- **Groq Llama 3.1 8B Integration**: Ultra-fast AI inference with large context windows
- **Progressive Processing**: Handles large pages by splitting into overlapping batches
- **Smart Token System**: Only consumes tokens when AI finds relevant matches
- **Custom System Prompts**: Personalize AI behavior for specific search needs

### 🔍 **Advanced Pattern Detection**
Automatically recognizes and converts common search patterns:
- **Email Addresses**: Multiple format recognition
- **Phone Numbers**: US/International formats with various separators
- **URLs & Links**: HTTP/HTTPS validation and detection
- **Dates**: MM/DD/YYYY, YYYY-MM-DD, and other formats
- **Times**: 12/24 hour formats with AM/PM support
- **Credit Cards**: Basic validation patterns
- **Social Security Numbers**: XXX-XX-XXXX format detection
- **IP Addresses**: IPv4 validation
- **ZIP Codes**: 5-digit and ZIP+4 formats

### 🎨 **Multi-Color Highlighting System**
- **5 Distinct Colors**: Yellow, green, pink, blue, purple for multi-term searches
- **Current Match Emphasis**: Darker highlighting for active result
- **AI Result Styling**: Special blue border styling for AI-found content
- **Performance Optimized**: Handles up to 10,000 highlights with batch processing

### 🔐 **Secure Authentication & Monetization**
- **Google OAuth 2.0**: Seamless sign-in with Chrome Identity API
- **JWT Token Management**: Secure backend communication
- **Encrypted Local Storage**: XOR encryption for sensitive data protection
- **Flexible Pricing**: 100 tokens = $1.00 (1 cent per token)
- **Free Monthly Tokens**: Regular allocation with automatic reset
- **Stripe Integration**: Secure payment processing

### ⚡ **Performance & User Experience**
- **Shadow DOM Isolation**: Complete style isolation from web pages
- **Event Isolation**: Extension events don't interfere with website interactions
- **Dynamic Content Monitoring**: Automatically updates results as pages change
- **Keyboard Navigation**: Full accessibility with standard shortcuts
- **Scroll Indicators**: Visual markers on page scroll bar
- **Progressive Loading**: Shows partial results during AI processing
- **Rate Limiting**: Intelligent API usage management

## 📁 Architecture

### File Structure
```
smart-finder-extension/
├── manifest.json          # Extension manifest (Manifest V3)
├── background.js          # Service worker for background tasks
├── content.js            # Content script entry point
├── popup.html            # Extension popup interface
├── popup.js              # Popup functionality and OAuth UI
├── help.html             # Integrated help documentation
├── privacy-policy.html   # Privacy policy
├── terms-conditions.html # Terms and conditions
└── modules/              # Modular JavaScript components
    ├── auth-manager.js   # OAuth 2.0 & JWT authentication
    ├── ai-service.js     # AI-powered search with Groq integration
    ├── smart-finder.js   # Main orchestration controller
    ├── event-handler.js  # Comprehensive event management
    ├── highlight-manager.js # Advanced text highlighting system
    ├── navigation-manager.js # Search result navigation
    ├── pattern-detector.js # Automatic pattern recognition
    ├── search-engine.js  # Core search functionality with regex support
    ├── storage-manager.js # Local data persistence
    ├── storage-migration.js # Data migration utilities
    └── ui-manager.js     # Shadow DOM UI management
```

### Technical Foundation
- **Manifest V3**: Modern Chrome extension architecture
- **Service Worker**: Background processing and command handling
- **Shadow DOM**: Complete UI isolation from web pages
- **Modular Design**: 11 specialized components for maintainability
- **Progressive Enhancement**: Graceful degradation and fallbacks

## 🚀 Installation & Setup

### From Chrome Web Store
1. Visit the Chrome Web Store
2. Search for "Smart Finder"
3. Click "Add to Chrome"
4. Grant necessary permissions
5. Sign in with Google for AI features

### Development Installation
1. Clone the repository
2. Run `../package-extension.sh` from the parent directory
3. Load unpacked extension in Chrome Developer Mode
4. Configure OAuth credentials in manifest.json

## 💡 Usage

### Basic Search
- Press **Ctrl+F** (Mac: **Cmd+F**) to activate Smart Finder
- Type your search query in the find bar
- Use **Enter** to navigate to next result
- Use **Shift+Enter** for previous result
- Press **Escape** to close

### AI Search Mode
1. **Sign in** with your Google account via the extension popup
2. **AI Mode** is enabled by default for signed-in users
3. If no regular text matches are found, you'll see an AI search prompt
4. Click **"Search with AI"** to use natural language processing
5. AI will find relevant content even if exact text doesn't match

### Advanced Features
- **Multi-term Search**: Separate terms with spaces for color-coded highlighting
- **Regex Search**: Enable in settings for advanced pattern matching
- **Pattern Detection**: Automatically converts common patterns (emails, phones, etc.)
- **Copy All Results**: Export all search results to clipboard
- **Custom AI Prompts**: Personalize AI behavior in advanced settings

### Settings & Customization
- Click the **stats button** (0/0) to access settings
- Toggle case sensitivity, regex mode, and multi-term highlighting
- Customize AI system prompts for specific search behaviors
- Enable/disable scroll indicators
- Access help documentation and legal pages

## 🔧 Configuration

### Environment Variables (Backend)
```env
GROQ_API_KEY=your_groq_api_key
JWT_SECRET=your_jwt_secret
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_KEY=your_service_key
STRIPE_SECRET_KEY=your_stripe_secret
```

### OAuth Configuration
- **Client ID**: Configured in manifest.json
- **Scopes**: `openid`, `email`, `profile`
- **Backend API**: Vercel deployment for user management
- **Redirect URLs**: Chrome extension protocol support

## 🛡️ Security & Privacy

### Data Protection
- **Encrypted Storage**: Sensitive data encrypted with XOR algorithm
- **JWT Authentication**: Secure API communication
- **No Content Storage**: Search content never stored on servers
- **CORS Protection**: Configured for extension domains only
- **Rate Limiting**: Prevents API abuse and ensures fair usage

### Privacy Commitment
- **Minimal Data Collection**: Only authentication and usage statistics
- **No Search History**: Search queries not stored or logged
- **User Control**: Complete account deletion available
- **Transparent Policies**: Clear privacy policy and terms

## 🎯 Use Cases

### Professional
- **Research**: Find specific information in long documents or articles
- **Data Extraction**: Locate emails, phone numbers, and other structured data
- **Content Analysis**: Use AI to find conceptually related information
- **Technical Documentation**: Search complex technical content with natural language

### Personal
- **Web Browsing**: Enhanced search for any website content
- **Shopping**: Find specific product information or reviews
- **Social Media**: Locate posts or comments with specific themes
- **Educational**: Research academic content with intelligent search

## 📈 Performance Metrics

- **Search Speed**: Sub-second response for regular searches
- **AI Processing**: 2-5 seconds for AI-powered searches
- **Memory Usage**: Optimized with 10,000 highlight limit
- **Battery Impact**: Minimal with efficient event handling
- **Compatibility**: Works on all websites (excluding chrome:// pages)

## 🤝 Support & Contributing

### Getting Help
- **Built-in Help**: Access via extension popup
- **Documentation**: Comprehensive guides and examples
- **Privacy Policy**: Detailed privacy information
- **Terms of Service**: Clear usage guidelines

### Technical Support
- Report issues through Chrome Web Store
- Check browser console for error messages
- Verify permissions and authentication status
- Try refreshing the page if search doesn't work

## 📄 License & Legal

This extension operates under standard Chrome Web Store terms with additional privacy protections and user rights as outlined in the included privacy policy and terms of service documents.
