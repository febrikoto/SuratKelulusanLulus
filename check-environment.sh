#!/bin/bash
# Script untuk memeriksa lingkungan server apakah sudah siap untuk deployment

echo "=== Pemeriksaan Lingkungan Server ==="
echo "Waktu saat ini: $(date)"

# Cek versi Node.js
echo -n "Node.js: "
if command -v node &> /dev/null; then
  node -v
else
  echo "TIDAK DITEMUKAN!"
fi

# Cek versi NPM
echo -n "NPM: "
if command -v npm &> /dev/null; then
  npm -v
else
  echo "TIDAK DITEMUKAN!"
fi

# Cek PM2
echo -n "PM2: "
if command -v pm2 &> /dev/null; then
  pm2 -v
else
  echo "TIDAK DITEMUKAN! (Direkomendasikan untuk process management)"
fi

# Cek TSX
echo -n "TSX: "
if command -v npx &> /dev/null && npx tsx --version &> /dev/null; then
  npx tsx --version
else
  echo "TIDAK DITEMUKAN! (Diperlukan untuk menjalankan TypeScript)"
fi

# Cek file konfigurasi
echo -e "\n=== Pemeriksaan File Konfigurasi ==="

echo -n ".env: "
if [ -f .env ]; then
  echo "ADA"
else
  echo "TIDAK DITEMUKAN!"
fi

echo -n "package.json: "
if [ -f package.json ]; then
  echo "ADA"
else
  echo "TIDAK DITEMUKAN!"
fi

# Cek direktori penting
echo -e "\n=== Pemeriksaan Direktori ==="

echo -n "server/: "
if [ -d server ]; then
  echo "ADA"
else
  echo "TIDAK DITEMUKAN!"
fi

echo -n "client/: "
if [ -d client ]; then
  echo "ADA"
else
  echo "TIDAK DITEMUKAN!"
fi

echo -n "uploads/: "
if [ -d uploads ]; then
  echo "ADA"
  echo -n "  Permission: "
  ls -ld uploads | awk '{print $1}'
else
  echo "TIDAK DITEMUKAN!"
fi

# Cek database
echo -e "\n=== Pemeriksaan Database ==="
echo "Menjalankan pemeriksaan koneksi database..."

if command -v npx &> /dev/null; then
  npx tsx scripts/check_database.js
else
  echo "Tidak dapat memeriksa database: 'npx' tidak ditemukan"
fi

echo -e "\n=== Pemeriksaan Selesai ==="
echo "* Jika ada warning atau error di atas, silakan selesaikan masalah tersebut sebelum melanjutkan"
echo "* Jika Node.js, NPM, dan file konfigurasi sudah ada, Anda siap untuk melanjutkan setup aplikasi"