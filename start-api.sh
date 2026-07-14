#!/bin/bash
# Start the Ahnajak Topup API server (MySQL edition)
# Usage: ./start-api.sh

# Load environment from .env if it exists
if [ -f .env ]; then
  export $(grep -v '^#' .env | xargs)
fi

echo "Starting Ahnajak Topup API server..."
node server/index.cjs
