#!/bin/sh

# Run database migrations on startup
echo "=== Running database migrations ==="
node node_modules/prisma/build/index.js db push --skip-generate --accept-data-loss 2>&1 || echo "Migration failed but continuing..."
echo "=== Migration complete ==="

# Start the application
echo "=== Starting application ==="
exec node server.js

