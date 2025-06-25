#!/bin/bash

# Package Firefox Smart Finder Extension
# This script creates a production-ready ZIP file for Firefox Add-ons submission

set -e

echo "🦊 Packaging Smart Finder for Firefox..."

# Create a temporary directory for packaging
TEMP_DIR="temp-firefox-package"
rm -rf "$TEMP_DIR"
mkdir -p "$TEMP_DIR"

# Copy all necessary files from firefox-finder-extension directory
echo "📁 Copying extension files..."
cp firefox-finder-extension/manifest.json "$TEMP_DIR/"
cp firefox-finder-extension/background.js "$TEMP_DIR/"
cp firefox-finder-extension/content.js "$TEMP_DIR/"
cp firefox-finder-extension/popup.html "$TEMP_DIR/"
cp firefox-finder-extension/popup.js "$TEMP_DIR/"
cp firefox-finder-extension/*.png "$TEMP_DIR/"
cp -r firefox-finder-extension/modules "$TEMP_DIR/"

# Navigate to temp directory
cd "$TEMP_DIR"

# Remove any hidden files that might have been copied
echo "🧹 Cleaning up hidden files..."
find . -name ".*" -type f -delete
find . -name "__MACOSX" -type d -exec rm -rf {} + 2>/dev/null || true

# Create the ZIP file
ZIP_NAME="../smart-finder-firefox-$(date +%Y%m%d-%H%M%S).zip"
echo "📦 Creating package: $ZIP_NAME"

# Create ZIP file with all files at root level
zip -r "$ZIP_NAME" . -x ".*" "*/.*" "__MACOSX/*"

# Move back to parent directory
cd ..

# Clean up temp directory
rm -rf "$TEMP_DIR"

# Show package info
echo "✅ Firefox extension packaged successfully!"
echo "📄 Package: $(basename "$ZIP_NAME")"
echo "📊 Size: $(du -h "$ZIP_NAME" | cut -f1)"
echo ""
echo "🚀 Ready for Firefox Add-ons submission!"
echo "💡 Upload this ZIP file to https://addons.mozilla.org/developers/"
echo ""
echo "📋 Next steps:"
echo "   1. Test the extension in Firefox"
echo "   2. Create developer account on Firefox Add-ons"
echo "   3. Submit for review"
echo "   4. Update OAuth redirect URLs for production" 