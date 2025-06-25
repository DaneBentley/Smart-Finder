# Analytics Implementation

Smart Finder includes privacy-focused analytics tracking using Google Analytics 4 to help improve the extension.

## What We Track

### Core Events
- **Extension Installation**: When the extension is first installed
- **Popup Opens**: When users open the extension popup
- **Search Usage**: Basic search vs AI search usage (no search content)
- **Authentication**: Sign-in and sign-out events
- **Feature Usage**: AI mode toggle, copy results, etc.
- **Settings Changes**: When users modify settings
- **Error Events**: Technical errors for debugging (no personal data)

### What We DON'T Track
- Search queries or content
- Personal information
- Browsing history
- Website URLs being searched
- User-generated content

## Privacy Features

### Data Minimization
- Only essential usage events are tracked
- No personally identifiable information (PII) is collected
- Automatic PII detection and filtering

### User Control
- Analytics can be disabled in Advanced Settings
- Default: Enabled (can be changed by user)
- Settings persist across sessions

### Chrome Extension Best Practices
- Content Security Policy compliant
- Proper host permissions
- No external cookies or storage
- IP anonymization enabled

## Technical Implementation

### Files
- `modules/analytics-manager.js`: Core analytics functionality
- `popup.html`: Analytics settings toggle UI
- `popup.js`: Settings integration
- `manifest.json`: Required permissions

### Configuration
Uses Google Analytics Measurement Protocol for Chrome extension compatibility:

```javascript
// Measurement Protocol payload
{
  measurement_id: 'G-TVZCG903H4',
  client_id: 'ext.randomid.timestamp',
  events: [{
    name: 'action_name',
    parameters: {
      event_category: 'category',
      session_id: 'session_timestamp',
      custom_parameter: 'value'
    }
  }]
}
```

### Event Format
```javascript
// Sent via fetch to Google Analytics Measurement Protocol
fetch('https://www.google-analytics.com/mp/collect', {
  method: 'POST',
  body: JSON.stringify(payload)
});
```

## Compliance

- **Privacy-First**: No PII collection
- **Transparent**: Clear documentation and UI controls
- **User Choice**: Can be disabled by users
- **Minimal Data**: Only essential events tracked
- **Secure**: Follows Chrome extension security guidelines

## Testing Analytics

To verify analytics are working:

1. Open Chrome DevTools → Network tab
2. Filter by "google-analytics" or "googletagmanager"
3. Perform actions in the extension
4. Check for outgoing analytics requests

Or check the Google Analytics Real-time reports in your GA4 dashboard. 