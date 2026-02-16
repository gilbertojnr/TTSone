#!/bin/bash
# Post-build script to fix GitHub Pages MIME type issues

echo "Fixing index.html for GitHub Pages..."

# Remove type="module" and crossorigin attributes
sed -i 's/type="module"//g' dist/index.html
sed -i 's/crossorigin//g' dist/index.html

# Ensure script tag doesn't have type="text/javascript" (which can cause issues)
sed -i 's/type="text\/javascript"//g' dist/index.html

# Clean up extra spaces
sed -i 's/  */ /g' dist/index.html
sed -i 's/ >/>/g' dist/index.html

echo "Done!"
