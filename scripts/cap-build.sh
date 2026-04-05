#!/bin/bash
set -e
echo "Building web assets..."
npm run build
echo "Syncing with Capacitor..."
npx cap sync
echo "Done! Native projects are ready."
