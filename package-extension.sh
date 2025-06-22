#!/bin/bash

# Smart Finder Chrome Extension Packaging Script
echo "Packaging Smart Finder Chrome Extension..."

# Remove any existing zip file
rm -f smart-finder-extension.zip

# Create zip file from the smart-finder-extension directory 
cd smart-finder-extension
zip -r ../smart-finder-extension.zip . -x "*.DS_Store" "*.git*"
cd ..

echo "Extension packaged successfully as smart-finder-extension.zip"
echo "You can now upload this zip file to Chrome Web Store or load as unpacked extension"
echo ""
echo "To load as unpacked extension in Chrome:"
echo "   1. Open Chrome and go to chrome://extensions/"
echo "   2. Enable 'Developer mode' in the top right"
echo "   3. Click 'Load unpacked' and select the 'smart-finder-extension' folder"
echo ""
echo "To upload to Chrome Web Store:"
echo "   1. Go to Chrome Web Store Developer Dashboard"
echo "   2. Upload the generated smart-finder-extension.zip file" 