#!/bin/bash
echo "Initializing SKL Application for SMKN 1 Lubuk Sikaping..."

# Set working directory to script location
cd "$(dirname "$0")"

# Ensure .env exists
if [ ! -f .env ]; then
  echo "ERROR: .env file not found!"
  echo "Please create .env file with database credentials first."
  exit 1
fi

# Check Node.js version
node_version=$(node -v)
echo "Using Node.js version: $node_version"

# Install dependencies
echo "Installing dependencies..."
npm install

# Build frontend (if not already built)
echo "Building frontend..."
npm run build

# Initialize database schema
echo "Initializing database schema..."
npx tsx scripts/restore_database.js

# Create necessary directories if they don't exist
mkdir -p uploads
chmod 755 uploads

echo "Initialization completed!"
echo "Now you can start the application with:"
echo "pm2 start server/index.ts --name 'skl-app'"