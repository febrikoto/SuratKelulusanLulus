#!/bin/bash
# Script untuk mempersiapkan file-file deployment SKL

# Mendapatkan timestamp untuk penamaan file
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
echo "=== Persiapan Deployment SKL ==="
echo "Timestamp: $TIMESTAMP"

# Build frontend dan backend
echo -n "Building frontend..."
npm run build
if [ $? -ne 0 ]; then
  echo "GAGAL: Build frontend gagal. Periksa error di atas."
  exit 1
fi
echo -e "\rFrontend build sukses!"

# Pastikan direktori backup ada
echo "Memeriksa direktori backup..."
if [ ! -d "backup" ]; then
  mkdir -p backup
fi

# Backup database terakhir (jika menggunakan database)
echo "Membuat backup database terakhir..."
if [ -f "scripts/export_database.js" ]; then
  node scripts/export_database.js backup/backup_$TIMESTAMP.json
  if [ $? -ne 0 ]; then
    echo "PERINGATAN: Backup database gagal, namun deployment tetap dilanjutkan."
  else
    echo "Database berhasil di-backup: backup/backup_$TIMESTAMP.json"
  fi
else
  echo "File export_database.js tidak ditemukan, melewati backup database."
fi

# Buat file deployment.zip yang berisi semua file yang diperlukan
echo "Membuat file deployment..."
ZIP_FILE="skl_deployment_$TIMESTAMP.zip"

# List file dan direktori yang akan di-deploy
FILES_TO_DEPLOY=(
  "dist"
  "scripts"
  "uploads"
  ".htaccess"
  "start.js"
  "package.json"
  "package-lock.json"
  "README.md"
)

# Membuat file deployment.zip
zip -r "$ZIP_FILE" "${FILES_TO_DEPLOY[@]}" -x "**/.DS_Store" -x "**/__MACOSX" -x "**/node_modules/**"
if [ $? -ne 0 ]; then
  echo "GAGAL: Pembuatan file deployment gagal."
  exit 1
fi

# Tampilkan instruksi
echo "=== Deployment Siap ==="
echo "File deployment: $ZIP_FILE"
echo ""
echo "Instruksi deployment:"
echo "1. Upload file $ZIP_FILE ke server hosting"
echo "2. Extract file zip tersebut di direktori root hosting"
echo "3. Buat file .env dengan konfigurasi database dan session"
echo "4. Jalankan 'npm install' untuk menginstall dependencies"
echo "5. Jika ini adalah deployment pertama, jalankan 'node scripts/restore_database.js'"
echo "6. Konfigurasikan Node.js di panel Niagahoster dengan entry point: start.js"
echo ""
echo "Lihat README.md untuk petunjuk lengkap deployment di Niagahoster"
echo "=== Selesai ==="