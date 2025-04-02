#!/bin/bash

# Set timestamp for the backup file
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="./backup/sql"
SCHEMA_FILE="$BACKUP_DIR/schema_$TIMESTAMP.sql"
DATA_FILE="$BACKUP_DIR/data_$TIMESTAMP.sql"
FULL_FILE="$BACKUP_DIR/full_backup_$TIMESTAMP.sql"
BACKUP_JSON="$BACKUP_DIR/json_backup_$TIMESTAMP.json"

# Create backup directory if it doesn't exist
mkdir -p $BACKUP_DIR

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
  echo "ERROR: DATABASE_URL environment variable is not set."
  exit 1
fi

echo "Starting database backup at $(date)"

# Use environment variables directly if available
if [ -n "$PGUSER" ] && [ -n "$PGPASSWORD" ] && [ -n "$PGHOST" ] && [ -n "$PGPORT" ] && [ -n "$PGDATABASE" ]; then
  DB_USER=$PGUSER
  DB_PASS=$PGPASSWORD
  DB_HOST=$PGHOST
  DB_PORT=$PGPORT
  DB_NAME=$PGDATABASE
else
  # Try to parse from DATABASE_URL as fallback
  echo "Parsing database connection from DATABASE_URL"
  # Extract database connection details from DATABASE_URL
  # Format: postgresql://username:password@hostname:port/database
  if [[ $DATABASE_URL =~ postgresql://([^:]+):([^@]+)@([^:]+):([0-9]+)/([^?]+) ]]; then
    DB_USER=${BASH_REMATCH[1]}
    DB_PASS=${BASH_REMATCH[2]}
    DB_HOST=${BASH_REMATCH[3]}
    DB_PORT=${BASH_REMATCH[4]}
    DB_NAME=${BASH_REMATCH[5]}
  else
    echo "Error: Could not parse DATABASE_URL correctly"
    exit 1
  fi
fi

echo "Database info:"
echo "- Host: $DB_HOST"
echo "- Port: $DB_PORT"
echo "- Database: $DB_NAME"
echo "- User: $DB_USER"

# Export schema only (no data)
echo "Exporting database schema to $SCHEMA_FILE..."
PGPASSWORD="$DB_PASS" pg_dump -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME --schema-only > $SCHEMA_FILE
echo "Schema export completed."

# Export data only (no schema)
echo "Exporting database data to $DATA_FILE..."
PGPASSWORD="$DB_PASS" pg_dump -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME --data-only > $DATA_FILE
echo "Data export completed."

# Export full backup (schema + data)
echo "Creating full backup to $FULL_FILE..."
PGPASSWORD="$DB_PASS" pg_dump -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME > $FULL_FILE
echo "Full backup completed."

# Create JSON backup using export_database.js script if it exists
if [ -f "./scripts/export_database.js" ]; then
  echo "Creating JSON backup using export_database.js script..."
  node ./scripts/export_database.js $BACKUP_JSON
  echo "JSON backup completed: $BACKUP_JSON"
  JSON_SIZE=$(du -h $BACKUP_JSON | cut -f1)
else
  echo "Skipping JSON backup: scripts/export_database.js not found"
  JSON_SIZE="N/A"
fi

# Summary
echo "Backup completed at $(date)"
echo "Files created:"
echo "- Schema: $SCHEMA_FILE ($(du -h $SCHEMA_FILE | cut -f1))"
echo "- Data: $DATA_FILE ($(du -h $DATA_FILE | cut -f1))"
echo "- Full: $FULL_FILE ($(du -h $FULL_FILE | cut -f1))"
echo "- JSON: $BACKUP_JSON ($JSON_SIZE)"
echo "Backup directory: $BACKUP_DIR"

# Instructions for restore
echo ""
echo "RESTORE INSTRUCTIONS:"
echo "1. To restore from SQL backup:"
echo "   PGPASSWORD=\"your_password\" psql -h hostname -U username -d database_name -f $FULL_FILE"
echo ""
echo "2. To restore from JSON backup:"
echo "   node scripts/import_database.js $BACKUP_JSON"
echo ""
echo "3. On production (DomainEsia hosting):"
echo "   - Upload file to server"
echo "   - Run: node scripts/import_database.js path/to/backup.json"