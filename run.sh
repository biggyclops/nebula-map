#!/bin/bash
# Run script for AsTrA Nebula Map server

set -e

echo "🚀 Starting AsTrA Nebula Map server..."

# Check if dist/ exists
if [ ! -d "dist" ]; then
    echo "⚠️  Warning: dist/ directory not found. Run ./build.sh first."
    echo "📦 Building frontend now..."
    ./build.sh
fi

# Check if Python dependencies are installed
if ! python3 -c "import fastapi, uvicorn, psutil, httpx" 2>/dev/null; then
    echo "❌ Error: Required Python packages not found."
    echo "📦 Install with: pip install fastapi uvicorn psutil httpx"
    exit 1
fi

# Start the server
echo "🌌 Starting uvicorn on 127.0.0.1:8000..."
python3 -m uvicorn main:app --host 127.0.0.1 --port 8000
