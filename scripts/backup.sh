#!/bin/bash

# Script untuk backup aplikasi SKL

# Membuat direktori backup jika belum ada
BACKUP_DIR="./backup"
mkdir -p $BACKUP_DIR

# Tanggal dan waktu saat ini untuk nama file
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

# Backup kode aplikasi
echo "Membuat backup kode aplikasi..."
APPLICATION_BACKUP="$BACKUP_DIR/skl_application_$TIMESTAMP.zip"
zip -r $APPLICATION_BACKUP . -x "node_modules/*" -x ".git/*" -x "backup/*"

# Backup database PostgreSQL
echo "Membuat backup database..."
DATABASE_BACKUP="$BACKUP_DIR/skl_database_$TIMESTAMP.sql"
pg_dump $DATABASE_URL > $DATABASE_BACKUP

echo "Backup selesai!"
echo "File backup kode aplikasi: $APPLICATION_BACKUP"
echo "File backup database: $DATABASE_BACKUP"
echo ""
echo "Untuk melakukan restore pada hosting baru:"
echo "1. Unzip file kode aplikasi ke direktori hosting"
echo "2. Buat database baru di hosting"
echo "3. Import file database ke database hosting dengan perintah:"
echo "   psql [DATABASE_URL_HOSTING] < $DATABASE_BACKUP"
echo "4. Sesuaikan file konfigurasi koneksi database (jika diperlukan)"