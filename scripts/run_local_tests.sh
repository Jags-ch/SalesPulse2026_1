#!/usr/bin/env bash
set -e

echo "Installing dependencies..."
npm ci

echo "Building project..."
npx cds build --production

echo "Starting CDS in-memory server for smoke test..."
NODE_ENV=test npx cds run &
PID=$!
sleep 5

echo "Checking service metadata..."
curl --fail http://localhost:4004/salespulse/$metadata || (echo 'Service not available' && kill $PID && exit 2)

echo "Smoke test passed. Stopping server..."
kill $PID
