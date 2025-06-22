# Smart Finder Legal Documents

This directory contains the legal documents for the Smart Finder Chrome Extension, hosted via GitHub Pages.

## Live Site

The documents are publicly accessible at: **https://danebentley.github.io/Smart-Finder/**

## Available Documents

- **[Privacy Policy](https://danebentley.github.io/Smart-Finder/privacy-policy.html)** - How we collect, use, and protect user information
- **[Terms & Conditions](https://danebentley.github.io/Smart-Finder/terms-conditions.html)** - Legal terms governing extension usage
- **[Help & Support](https://danebentley.github.io/Smart-Finder/help.html)** - Complete user guide and troubleshooting

## GitHub Pages Setup

### Automatic Setup
GitHub Pages is configured to automatically deploy from the `docs/` directory on the `main` branch.

### Manual Setup (if needed)
1. Go to your repository's **Settings** tab
2. Scroll down to **Pages** section
3. Under **Source**, select "Deploy from a branch"
4. Choose **main** branch and **/docs** folder
5. Click **Save**

### Custom Domain (Optional)
To use a custom domain:
1. Add a `CNAME` file to the `docs/` directory with your domain name
2. Configure your domain's DNS settings to point to `danebentley.github.io`

## Updates

When updating legal documents:
1. Edit the HTML files in the `docs/` directory
2. Commit and push changes to the `main` branch
3. GitHub Pages will automatically redeploy (usually takes 1-5 minutes)

## Integration

The Smart Finder Chrome Extension links to these documents:
- Extension popup footer links point to GitHub Pages URLs
- Help button in extension opens the GitHub Pages help document
- All cross-references between documents use GitHub Pages URLs

## File Structure

```
docs/
├── _config.yml          # Jekyll configuration for GitHub Pages
├── index.html           # Main landing page with navigation
├── privacy-policy.html  # Privacy Policy document
├── terms-conditions.html # Terms & Conditions document
├── help.html            # Help & Support guide
└── README.md           # This file
```

## Benefits

- **Always Available**: Documents are hosted independently of the extension
- **Fast Loading**: Served via GitHub's CDN
- **Version Control**: All changes are tracked in git
- **No Extension Bloat**: Reduces extension package size
- **Easy Updates**: Update documents without releasing new extension version 