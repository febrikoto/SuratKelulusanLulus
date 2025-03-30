#!/bin/bash
# Script untuk melakukan backup data aplikasi SKL
# Gunakan cron untuk menjalankan script ini secara terjadwal

# Set waktu dan tanggal untuk nama file
TIMESTAMP=$(date +"%Y%m%d-%H%M%S")
BACKUP_DIR="./backup/data"
UPLOADS_DIR="./uploads"

# Buat direktori backup jika belum ada
mkdir -p "$BACKUP_DIR"

# Jalankan script export database ke JSON
echo "Exporting database to JSON..."
node scripts/export_database.js

# Backup folder uploads (logo, tanda tangan, dll)
echo "Backing up uploads folder..."
tar -czf "$BACKUP_DIR/uploads-$TIMESTAMP.tar.gz" "$UPLOADS_DIR"

echo "Backup completed successfully!"
echo "Database: $BACKUP_DIR/full_export_*.json"
echo "Uploads: $BACKUP_DIR/uploads-$TIMESTAMP.tar.gz"

# Hapus backup yang lebih lama dari 30 hari (opsional)
# find "$BACKUP_DIR" -name "*.tar.gz" -type f -mtime +30 -delete
# find "$BACKUP_DIR" -name "full_export_*.json" -type f -mtime +30 -delete

exit 0