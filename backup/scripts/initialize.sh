#!/bin/bash
# Script untuk inisialisasi aplikasi SKL pada server baru
# Jalankan script ini setelah mengekstrak file aplikasi

# Pastikan .env ada
if [ ! -f .env ]; then
  echo "File .env tidak ditemukan!"
  echo "Silakan salin backup/database_variables.env ke .env dan sesuaikan konfigurasinya"
  exit 1
fi

# Install dependensi
echo "Menginstall dependensi aplikasi..."
npm install

# Buat folder uploads
echo "Membuat direktori uploads..."
mkdir -p uploads/logos uploads/signatures uploads/stamps uploads/letterheads
chmod -R 755 uploads

# Inisialisasi database
echo "Menginisialisasi database..."
node scripts/restore_database.js

# Build aplikasi untuk production
echo "Membangun aplikasi untuk production..."
npm run build

echo "Inisialisasi selesai!"
echo "Jalankan 'npm start' untuk memulai aplikasi"
exit 0