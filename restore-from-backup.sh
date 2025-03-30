#!/bin/bash
# Script untuk memulihkan database dari file backup

# Set working directory to script location
cd "$(dirname "$0")"

BACKUP_FILE=""

# Cek apakah ada parameter file backup
if [ -n "$1" ]; then
  BACKUP_FILE="$1"
else
  # Gunakan file backup terbaru jika tidak ada parameter
  BACKUP_FILE="./backup/data/full_export_latest.json"
fi

# Cek apakah file backup ada
if [ ! -f "$BACKUP_FILE" ]; then
  echo "ERROR: File backup tidak ditemukan: $BACKUP_FILE"
  exit 1
fi

echo "Memulihkan database dari file: $BACKUP_FILE"

# Jalankan script import_database.js
npx tsx scripts/import_database.js "$BACKUP_FILE"

echo "Proses pemulihan database selesai."