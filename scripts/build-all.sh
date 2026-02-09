#!/bin/bash
set -e

echo "🏗️  Building All Greenfield Apps..."

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

# Build desktop app
echo "🔨 Building desktop application..."
cd apps/desktop
npx tsc && npx electron-builder
cd ../..

echo "✅ All builds complete!"
echo "📁 Web output: apps/web/.next"
echo "📁 Desktop output: apps/desktop/release/"
