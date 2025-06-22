# SmartFinder with AI Search

A faithful one-to-one reproduction of Chrome's native "Find on page" functionality as a Chrome extension, enhanced with AI-powered intelligent search capabilities. This extension replicates the exact behavior and appearance of Chrome's built-in find feature while adding the ability to search using natural language queries.

## Features

### Core Functionality
- **Native-like Find Bar**: Positioned and styled to match Chrome's native find bar
- **AI-Powered Search**: 🤖 Toggle AI mode to ask questions in natural language
- **Dynamic Content Adaptation**: 🔄 Automatically detects and includes new content (infinite scroll, dynamic loading)
- **Real-time Search**: Instant highlighting as you type with intelligent debouncing
- **Match Navigation**: Navigate through results with Enter/Shift+Enter or navigation buttons
- **Match Statistics**: Shows current match position and total count (e.g., "2 of 15")
- **Smart Highlighting**: Yellow highlights for all matches, orange for current match, blue for AI results
- **Multi-term Highlighting**: Optional feature to highlight multiple space-separated terms with different colors
- **Selected Text Integration**: Pre-fills find bar with selected text when opened

### AI Search Features
- **Natural Language Queries**: Ask questions like "What is this page about?" or "How do I install this?"
- **Intelligent Analysis**: Uses Cerebras AI's LLaMA model to understand page content
- **Relevant Highlighting**: AI identifies and highlights the most relevant text snippets
- **Context-Aware Results**: Understands the meaning behind your queries, not just keywords
- **Pattern Detection**: 🎯 Automatically detects and searches for common patterns (emails, phone numbers, dates, etc.)
- **Seamless Integration**: AI mode preserves all existing functionality

### Technical Implementation
- **TreeWalker API**: Efficient text node traversal matching Chrome's native approach
- **DOM Range Highlighting**: Uses `Range.surroundContents()` for text highlighting
- **MutationObserver**: Monitors DOM changes for dynamic content (infinite scroll, AJAX updates)
- **Visibility Filtering**: Skips hidden elements (`display:none`, `visibility:hidden`, `opacity:0`)
- **Content Filtering**: Excludes script tags, style tags, and zero-size elements
- **Case-insensitive Search**: Matches text regardless of case
- **Debounced Input**: 100ms debounce timer for optimal performance
- **Adaptive Re-search**: Automatically re-runs searches when new content is detected

### User Experience
- **Keyboard Shortcuts**: 
  - `Ctrl+F` / `Cmd+F` - Open find bar
  - `Enter` - Next match
  - `Shift+Enter` - Previous match  
  - `Escape` - Close find bar
- **Badge Updates**: Extension badge shows match count
- **Smooth Scrolling**: Animated scrolling to current match
- **Visual Feedback**: Input styling changes for no results
- **Cross-platform**: Works on Windows, Mac, and Linux

## Installation

### From Source
1. Download or clone this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top right
4. Click "Load unpacked" and select the extension directory
5. The extension will appear in your extensions list

### AI Setup (Optional)
To enable AI search functionality, see the [AI Setup Guide](AI_SETUP_GUIDE.md) for detailed instructions on:
- Getting a Cerebras AI API key
- Deploying the backend to Vercel
- Configuration and testing

### From Chrome Web Store
*Coming soon - extension will be published to the Chrome Web Store*

## Usage

### Opening the Find Bar
- **Keyboard**: Press `Ctrl+F` (Windows/Linux) or `Cmd+F` (Mac)
- **Extension Icon**: Click the SmartFinder icon in the toolbar
- **Extension Popup**: Click the "Open Find Bar" button

### Searching

#### Regular Search
1. Type your search term in the find bar
2. Matches are highlighted in real-time (yellow for all matches, orange for current)
3. Use navigation buttons or keyboard shortcuts to move between matches
4. Match statistics show your position (e.g., "3 of 12")

#### AI Search
1. Click the 🤖 AI toggle button (turns blue when active)
2. Type a natural language question (e.g., "What are the main benefits?")
3. Press Enter and wait for AI analysis (2-5 seconds)
4. Relevant content is highlighted in blue
5. Navigate through AI-identified snippets using normal controls

#### Pattern Detection (AI Mode Only)
In AI mode, Findr automatically detects common patterns and converts them to regex searches:

**Supported Patterns:**
- **📧 Email Addresses**: Search "email", "e-mail", "mail", or "@" to find all email addresses
- **📞 Phone Numbers**: Search "phone", "telephone", "mobile", "cell" to find phone numbers
- **🌐 URLs**: Search "url", "link", "website", "http" to find web addresses  
- **📅 Dates**: Search "date", "birthday", "created", "expires", "deadline" to find dates (MM/DD/YYYY, March 15 2024, Jan 3rd, etc.)
- **🕐 Times**: Search "time", "clock", "hour" to find time patterns (HH:MM, HH:MM AM/PM)
- **🏠 Street Addresses**: Search "address", "street", "avenue" to find full addresses (123 Main St, 456 Oak Ave Apt 2B)
- **🗺️ US States**: Search "state" to find state names and abbreviations (California, TX, New York)
- **🌍 Countries**: Search "country" to find country names (United States, Canada, Germany)
- **🏙️ Cities**: Search "city", "town" to find cities and towns (New York City, San Francisco)
- **📮 ZIP/Postal Codes**: Search "zip", "postal code" to find codes (12345, K1A 0A6, SW1A 1AA)
- **🌐 IP Addresses**: Search "ip", "server" to find IP addresses (192.168.1.1)
- **💳 Credit Cards**: Search "credit card", "card number", "visa" to find card numbers
- **🔢 SSN**: Search "ssn", "social security" to find social security numbers

**How it Works:**
1. Type a pattern keyword (e.g., "email") in AI mode
2. Findr shows "Searching for email addresses using pattern detection"
3. All matching patterns on the page are automatically highlighted
4. Navigate through results normally with Enter/Shift+Enter

**Multi-Pattern Search:**
- Type multiple keywords: "phone email" → finds both phone numbers and emails
- Works with any combination: "date time", "address zip", "state country", "url ip"
- Shows combined message: "Searching for phone numbers and email addresses using pattern detection"
- **Different Colors**: Each pattern type gets its own highlight color (phone numbers = yellow, emails = blue, etc.)
- Navigate through all matches normally with Enter/Shift+Enter

**Direct Pattern Recognition:**
- Type an actual email like "john@example.com" → finds all emails
- Type a phone number like "(555) 123-4567" → finds all phone numbers
- Type a URL like "https://example.com" → finds all URLs

### Advanced Features
- **Settings Dropdown**: Click the match statistics to access advanced settings
- **Multi-term Highlighting**: Enable to search for multiple space-separated terms with different colored highlights
  - Use quotes for phrases with spaces: `"hello world" test` will search for the phrase "hello world" and the word "test"
  - Supports single quotes, double quotes, and question marks: `'quoted phrase' ?another phrase? word`
  - Each term gets a different color in both text highlights and scroll indicators
- **Case Sensitivity**: Toggle case-sensitive matching
- **Regular Expressions**: Enable regex pattern matching

### Navigation
- **Next Match**: Click ▼ button or press `Enter`
- **Previous Match**: Click ▲ button or press `Shift+Enter`  
- **Close**: Click ✕ button or press `Escape`

### Dynamic Content Adaptation
Findr automatically adapts to content changes without requiring manual intervention:

- **Infinite Scroll**: New search results appear automatically as content loads
- **Dynamic Updates**: Detects AJAX content, live feeds, and real-time updates  
- **Incremental Search**: Only searches new content, preserving existing highlights
- **Performance Optimized**: Uses debounced re-searching (300ms delay) to avoid excessive processing
- **AI Mode Aware**: Disabled in AI mode since AI results are contextual and shouldn't change
- **Content Tracking**: Maintains a snapshot of searched content to avoid re-processing
- **Non-Intrusive**: Won't interrupt active typing or navigation, only triggers when search bar is visible
- **Substantial Changes Only**: Requires 100+ characters of new content to trigger
- **Seamless Experience**: No need to delete and retype search terms

**Test the Feature**:
1. Open the included `test-infinite-scroll.html` file
2. Search for "apple", "banana", or "dynamic"
3. Click "Load More Content" or enable auto-loading
4. Watch new results appear automatically!
5. Notice the green "re-searching" indicator shows when updates occur
6. Existing highlights are preserved - no flickering or re-rendering

## Technical Details

### Architecture
The extension follows Chrome extension Manifest V3 standards and consists of:

- **Background Service Worker** (`background.js`): Handles keyboard shortcuts and messaging
- **Content Script** (`content.js`): Main find functionality injected into web pages
- **Popup Interface** (`popup.html/js`): Extension popup for manual activation
- **Styling** (`findbar.css`): Native-style appearance and highlighting

### Native Browser Behavior Replication

#### Text Traversal
Uses `document.createTreeWalker()` with `NodeFilter.SHOW_TEXT` to traverse only text nodes, exactly like browsers' native implementation.

#### Visibility Filtering
Implements standard browser visibility checks:
- `display: none` elements
- `visibility: hidden` elements  
- `opacity: 0` elements
- Zero-width/height elements
- `<script>`, `<style>`, `<noscript>` tags

#### Text Highlighting
- Uses `Range.surroundContents()` for wrapping text ranges with highlight spans
- Falls back to `extractContents()` + `insertNode()` for complex ranges
- Applies simple span-based highlighting (no fixed-position overlays)

#### Search Behavior
- Case-insensitive text matching
- Real-time search with 100ms debounce
- Circular navigation (wraps around at end/beginning)
- Selected text pre-population when opening find bar

### Performance Optimizations

### Heavy Search Volume Protection

SmartFind includes comprehensive performance optimizations to prevent the search bar from freezing under heavy search volume:

#### Search Engine Optimizations
- **Progressive Search**: Large searches are broken into chunks with periodic yielding to the main thread
- **Match Limiting**: Searches are automatically limited to 10,000 matches for optimal performance
- **Search Cancellation**: Ongoing searches can be cancelled when new searches are initiated
- **Adaptive Debouncing**: Debounce delays automatically adjust based on search complexity and previous result volumes

#### UI Performance Enhancements
- **Batch Highlighting**: Large numbers of highlights are processed in batches to prevent UI freezing
- **Highlight Limiting**: Visual highlights are capped at 1,000 for optimal rendering performance
- **Progress Indicators**: Users receive real-time feedback during long searches with animated progress indicators
- **Graceful Degradation**: Performance warnings are shown when search limits are reached

#### Smart Input Handling
- **Typing Indicators**: Immediate visual feedback while typing to improve perceived responsiveness
- **Search Queuing**: Pending searches replace in-progress searches to prevent accumulation
- **Volume-Aware Delays**: Longer debounce delays for potentially expensive operations (regex, short terms)

#### Memory Management
- **Efficient Cleanup**: Highlights are cleared in batches to prevent memory spikes
- **Range Optimization**: Search ranges are sorted and managed efficiently
- **Resource Monitoring**: Search operations yield control regularly to maintain UI responsiveness

These optimizations ensure SmartFind remains responsive even when searching large documents or performing complex regex operations.

## Browser Compatibility

- **Chrome**: Version 88+ (Manifest V3 support)
- **Chromium-based Browsers**: Edge, Brave, Opera, etc.
- **Permissions**: Only requires `activeTab` and `scripting`

## Limitations

- Cannot search in browser internal pages (`chrome://`, `chrome-extension://`)
- Does not search in Shadow DOM (matching browsers' native behavior)
- Does not search in pseudo-elements or element attributes
- Limited to visible text content only

## Development

### File Structure
```
smart-finder-extension/
├── manifest.json          # Extension manifest
├── background.js          # Service worker
├── content.js            # Main find functionality
├── modules/               # Core functionality modules
│   ├── smart-finder.js   # Main controller
│   ├── ui-manager.js     # UI components
│   ├── search-engine.js  # Search logic
│   └── ...               # Other modules
├── popup.html           # Extension popup
├── popup.js             # Popup functionality
└── README.md            # Documentation
```

### Building and Testing
1. Load the extension in developer mode
2. Test on various websites with different content types
3. Verify keyboard shortcuts work correctly
4. Check highlighting accuracy and performance
5. Test on different screen sizes and zoom levels

### Key Implementation Points
- TreeWalker traversal for text nodes
- Range API for highlighting
- Chrome extension messaging
- CSS styling with `!important` declarations
- Proper event handling and cleanup

## Contributing

Contributions are welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Test thoroughly across different websites
4. Submit a pull request with detailed description

## License

This project is open source and available under the MIT License.

## Acknowledgments

This extension replicates the behavior of browsers' native find functionality. Implementation details were derived from:
- Chrome DevTools documentation
- Chromium source code analysis  
- DOM API specifications
- Chrome extension development guidelines

The goal is to provide a faithful reproduction of browsers' native find experience while demonstrating modern web API usage and extension development best practices. 