#!/bin/bash
# Build script for Vercel deployment
# This replaces the __BACKEND_URL__ placeholder with the actual environment variable

if [ -z "$BACKEND_URL" ]; then
  echo "⚠️  WARNING: BACKEND_URL environment variable is not set!"
  echo "The app will not work correctly without it."
  exit 1
fi

echo "🔧 Replacing __BACKEND_URL__ with: $BACKEND_URL"
sed -i "s|__BACKEND_URL__|$BACKEND_URL|g" config.js

echo "✅ Build configuration complete!"
