#!/usr/bin/env bash
# render-build.sh — called by Render as the Build Command
# Installs deps for both frontend and backend, builds Angular,
# then copies the dist into backend/public so Express can serve it.

set -e

echo "==> Installing frontend dependencies..."
cd frontend
npm ci

echo "==> Building Angular for production..."
npx ng build --configuration production
# Angular 17+ outputs to dist/frontend/browser, older to dist/frontend
DIST_DIR="dist/frontend"
[ -d "dist/frontend/browser" ] && DIST_DIR="dist/frontend/browser"

echo "==> Copying Angular build to backend/public..."
cd ..
rm -rf backend/public
cp -r frontend/$DIST_DIR backend/public

echo "==> Installing backend dependencies..."
cd backend
npm ci

echo "==> Seeding database with demo data..."
node seed.js

echo "==> Build complete."
