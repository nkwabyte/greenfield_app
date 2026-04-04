#!/bin/bash
set -e

echo "🖥️  Building Greenfield Desktop App..."

# Navigate to project root
cd "$(dirname "$0")/.."

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    yarn install
fi

# Build web app first (desktop depends on it).
# build:electron sets ELECTRON_BUILD=1, producing a static export at apps/web/out/
# that electron-builder bundles into the final package.
echo "🔨 Building web application (Electron static export)..."
yarn workspace @greenfield/web run build:electron

# Build desktop app
echo "🔨 Building desktop application..."
cd apps/desktop
npx tsc && npx electron-builder

echo "✅ Desktop app build complete!"
echo "📁 Build output: apps/desktop/release/"
