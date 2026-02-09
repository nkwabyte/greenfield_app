#!/bin/bash
set -e

echo "🚀 Building Greenfield Web App..."

# Navigate to project root
cd "$(dirname "$0")/.."

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    yarn install
fi

# Build web app
echo "🔨 Building web application..."
yarn workspace @greenfield/web build

echo "✅ Web app build complete!"
echo "📁 Build output: apps/web/.next"
