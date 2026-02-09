#!/bin/bash
set -e

echo "🧹 Cleaning build artifacts..."

# Navigate to project root
cd "$(dirname "$0")/.."

# Clean web build
if [ -d "apps/web/.next" ]; then
    echo "🗑️  Removing apps/web/.next"
    rm -rf apps/web/.next
fi

# Clean desktop build
if [ -d "apps/desktop/dist" ]; then
    echo "🗑️  Removing apps/desktop/dist"
    rm -rf apps/desktop/dist
fi

if [ -d "apps/desktop/release" ]; then
    echo "🗑️  Removing apps/desktop/release"
    rm -rf apps/desktop/release
fi

# Clean node_modules if requested
if [ "$1" == "--deep" ]; then
    echo "🗑️  Deep clean: Removing node_modules..."
    rm -rf node_modules
    rm -rf apps/web/node_modules
    rm -rf apps/desktop/node_modules
    rm -rf yarn.lock
fi

echo "✅ Clean complete!"
