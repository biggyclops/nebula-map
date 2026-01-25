#!/bin/bash
# Build script for AsTrA Nebula Map frontend

set -e

echo "🔨 Building AsTrA Nebula Map frontend..."

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "📦 Installing npm dependencies..."
    npm install
fi

# Build the frontend
echo "🏗️  Building with Vite..."
npm run build

# Verify build output
if [ ! -d "dist" ]; then
    echo "❌ Error: dist/ directory not found after build"
    exit 1
fi

echo "✅ Build complete! dist/ directory ready for deployment."
