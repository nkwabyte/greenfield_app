#!/bin/bash
set -e

# Usage: ./scripts/release-desktop.sh <version>
# Example: ./scripts/release-desktop.sh v1.0.1

if [ -z "$1" ]; then
  echo "❌ Error: Version argument is required."
  echo "Usage: ./scripts/release-desktop.sh <version>"
  echo "Example: ./scripts/release-desktop.sh v1.0.1"
  exit 1
fi

VERSION=$1

# Ensure version starts with 'v'
if [[ ! "$VERSION" =~ ^v ]]; then
    VERSION="v$VERSION"
fi

echo "🚀 Preparing release for version: $VERSION"

# Extract version number without 'v' prefix
CLEAN_VERSION="${VERSION#v}"

# 0. Sync package.json version
echo "🔄 Updating apps/desktop/package.json to $CLEAN_VERSION..."
# Use sed to update the version directly to bypass EPERM errors from npm
sed -i.bak -E 's/"version": "[^"]+"/"version": "'"$CLEAN_VERSION"'"/' apps/desktop/package.json
rm -f apps/desktop/package.json.bak

# 1. Stage changes (assuming user modified package.json version)
echo "📦 Staging changes..."
git add .

# 2. Commit if there are changes
if ! git diff-index --quiet HEAD --; then
    echo "💾 Committing changes..."
    git commit -m "chore: release $VERSION"
else
    echo "✅ No changes to commit, proceeding..."
fi

# 3. Create Tag
if git rev-parse "$VERSION" >/dev/null 2>&1; then
    echo "⚠️  Tag $VERSION already exists. Skipping tag creation."
    read -p "Do you want to delete the existing tag locally and remote? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        git tag -d "$VERSION"
        git push origin --delete "$VERSION" || true
        echo "🗑️  Deleted existing tag."
        git tag -a "$VERSION" -m "Release $VERSION"
        echo "🏷️  Re-created tag $VERSION"
    else
        echo "Exiting."
        exit 1
    fi
else
    echo "🏷️  Creating tag $VERSION..."
    git tag -a "$VERSION" -m "Release $VERSION"
fi

# 4. Push
echo "⬆️  Pushing changes and tag to origin..."
git push
git push origin "$VERSION"

echo "✅ Done! GitHub Actions 'Desktop Release' workflow has been triggered for $VERSION."
echo "🔗 check your releases here: https://github.com/nkwabyte/greenfield_app/releases"
