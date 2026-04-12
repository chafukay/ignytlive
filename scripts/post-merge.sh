#!/bin/bash
set -e
echo "Running post-merge setup..."
npm install --no-audit --no-fund < /dev/null
echo "Post-merge setup complete."
