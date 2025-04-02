#!/bin/bash

# Restore from backup script for SKL Application
# This script can restore data from SQL or JSON backup files

# Set default values
BACKUP_FILE=""
BACKUP_TYPE=""
SCHEMA_ONLY=false

# Function to display usage information
show_usage() {
  echo "Usage: $0 [OPTIONS] -f <backup_file>"
  echo ""
  echo "Options:"
  echo "  -f, --file FILE       Path to backup file (required)"
  echo "  -t, --type TYPE       Backup type: sql or json (optional, auto-detected from file extension)"
  echo "  -s, --schema-only     Restore only the database schema (for SQL backups only)"
  echo "  -h, --help            Show this help message"
  echo ""
  echo "Examples:"
  echo "  $0 -f backup/sql/full_backup_20250402.sql"
  echo "  $0 -f backup/data/full_export_20250402.json -t json"
  echo "  $0 -f backup/sql/schema_20250402.sql -s"
  echo ""
}

# Parse command-line arguments
while [[ $# -gt 0 ]]; do
  case "$1" in
    -f|--file)
      BACKUP_FILE="$2"
      shift 2
      ;;
    -t|--type)
      BACKUP_TYPE="$2"
      shift 2
      ;;
    -s|--schema-only)
      SCHEMA_ONLY=true
      shift
      ;;
    -h|--help)
      show_usage
      exit 0
      ;;
    *)
      echo "Error: Unknown option: $1"
      show_usage
      exit 1
      ;;
  esac
done

# Check if backup file is provided
if [ -z "$BACKUP_FILE" ]; then
  echo "Error: No backup file specified."
  show_usage
  exit 1
fi

# Check if backup file exists
if [ ! -f "$BACKUP_FILE" ]; then
  echo "Error: Backup file not found: $BACKUP_FILE"
  exit 1
fi

# Auto-detect backup type if not specified
if [ -z "$BACKUP_TYPE" ]; then
  if [[ "$BACKUP_FILE" == *.sql ]]; then
    BACKUP_TYPE="sql"
  elif [[ "$BACKUP_FILE" == *.json ]]; then
    BACKUP_TYPE="json"
  else
    echo "Error: Could not determine backup type from file extension."
    echo "Please specify the backup type using -t option (sql or json)."
    exit 1
  fi
fi

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
  echo "ERROR: DATABASE_URL environment variable is not set."
  exit 1
fi

echo "Starting database restore at $(date)"
echo "Backup file: $BACKUP_FILE"
echo "Backup type: $BACKUP_TYPE"

# Handle SQL restore
if [ "$BACKUP_TYPE" = "sql" ]; then
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

  echo "Database connection info:"
  echo "- Host: $DB_HOST"
  echo "- Port: $DB_PORT"
  echo "- Database: $DB_NAME"
  echo "- User: $DB_USER"

  # Execute SQL restore
  echo "Restoring from SQL backup: $BACKUP_FILE"
  
  if $SCHEMA_ONLY; then
    echo "Restoring schema only..."
  fi
  
  # Using psql to restore the backup
  PGPASSWORD="$DB_PASS" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "$BACKUP_FILE"
  
  # Check restore status
  if [ $? -eq 0 ]; then
    echo "SQL restore completed successfully!"
  else
    echo "Error: SQL restore failed."
    exit 1
  fi

# Handle JSON restore
elif [ "$BACKUP_TYPE" = "json" ]; then
  # Check if import script exists
  if [ ! -f "./scripts/import_database.js" ]; then
    echo "Error: Import script not found: ./scripts/import_database.js"
    exit 1
  fi

  # Execute JSON restore using the import script
  echo "Restoring from JSON backup: $BACKUP_FILE"
  node ./scripts/import_database.js "$BACKUP_FILE"
  
  # Check restore status
  if [ $? -eq 0 ]; then
    echo "JSON restore completed successfully!"
  else
    echo "Error: JSON restore failed."
    exit 1
  fi

else
  echo "Error: Invalid backup type: $BACKUP_TYPE"
  echo "Supported types: sql, json"
  exit 1
fi

echo "Restore process completed at $(date)"