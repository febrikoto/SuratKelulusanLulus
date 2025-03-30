#!/bin/bash
# Script untuk melakukan backup database

# Set working directory to script location
cd "$(dirname "$0")"

# Waktu saat ini untuk penamaan file
TIMESTAMP=$(date +"%Y-%m-%d_%H-%M-%S")
BACKUP_DIR="./backup/data"

# Pastikan direktori backup ada
mkdir -p $BACKUP_DIR

echo "Memulai backup database pada: $TIMESTAMP"

# Jalankan script export_database.js
npx tsx scripts/export_database.js

# Buat symlink ke file backup terbaru
LATEST_BACKUP=$(ls -t $BACKUP_DIR/full_export_*.json | head -1)
if [ -n "$LATEST_BACKUP" ]; then
  echo "Backup terbaru: $LATEST_BACKUP"
  ln -sf "$LATEST_BACKUP" "$BACKUP_DIR/full_export_latest.json"
  echo "Symlink dibuat ke: $BACKUP_DIR/full_export_latest.json"
else
  echo "ERROR: Tidak ada file backup yang ditemukan!"
fi

echo "Proses backup selesai."