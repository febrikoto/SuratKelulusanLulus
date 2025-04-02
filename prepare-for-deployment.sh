#!/bin/bash

# Script untuk mempersiapkan deployment di Domainesia
# Jalankan script ini sebelum mengunggah ke server Domainesia

echo "=== Persiapan Deployment Aplikasi SKL ke Domainesia ==="

# 1. Pastikan file env-for-domainesia.env ada
if [ ! -f "env-for-domainesia.env" ]; then
  echo "ERROR: File env-for-domainesia.env tidak ditemukan!"
  echo "Membuat file env-for-domainesia.env dengan kredensial database default..."
  
  cat > env-for-domainesia.env << 'EOL'
# Database Configuration - Domainesia PostgreSQL
DATABASE_URL=postgresql://anytimem_skl:h69bgicM%2A@127.0.0.1:5432/anytimem_sklsmk
PGHOST=127.0.0.1
PGPORT=5432
PGUSER=anytimem_skl
PGPASSWORD=h69bgicM*
PGDATABASE=anytimem_sklsmk

# Session Configuration 
SESSION_SECRET=string_acak_32_karakter

# Server Configuration
PORT=3000
NODE_ENV=production
EOL
  
  echo "File env-for-domainesia.env dibuat, mohon sesuaikan kredensial jika diperlukan"
  exit 1
fi

# 2. Salin file env-for-domainesia.env ke .env
echo "Menyalin env-for-domainesia.env ke .env..."
cp env-for-domainesia.env .env

# 2.1 Verifikasi kredensial database
echo "Verifikasi format kredensial database..."

# Periksa apakah DATABASE_URL sudah benar
if ! grep -q "postgresql://anytimem_skl:h69bgicM%2A@127.0.0.1:5432/anytimem_sklsmk" .env; then
  echo "PERINGATAN: DATABASE_URL mungkin tidak sesuai dengan format yang diharapkan."
  echo "Format yang benar: postgresql://anytimem_skl:h69bgicM%2A@127.0.0.1:5432/anytimem_sklsmk"
  echo "(Perhatikan karakter khusus '%2A' yang merupakan URL-encode untuk '*')"
  echo "(atau sesuai dengan kredensial yang diberikan Domainesia)"
fi

# Periksa apakah host database sudah benar
if ! grep -q "PGHOST=127.0.0.1" .env; then
  echo "PERINGATAN: PGHOST mungkin tidak sesuai dengan yang diharapkan (127.0.0.1)"
fi

# 3. Pastikan file .htaccess ada
if [ ! -f ".htaccess" ]; then
  echo "Membuat file .htaccess untuk Domainesia..."
  cat > .htaccess << 'EOL'
<IfModule mod_rewrite.c>
  RewriteEngine On
  
  # Handle node application
  RewriteRule ^$ - [L]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule ^(.*)$ / [L,QSA]
</IfModule>

# DO NOT REMOVE - CLOUDLINUX PASSENGER CONFIGURATION BEGIN
PassengerAppRoot /home/u7079808/public_html
PassengerBaseURI /
PassengerNodejs /home/u7079808/nodevenv/public_html/18/bin/node
PassengerAppType node
PassengerStartupFile start.js
# DO NOT REMOVE - CLOUDLINUX PASSENGER CONFIGURATION END
EOL
  echo "File .htaccess dibuat"
fi

# 4. Pastikan paket yang dibutuhkan sudah terinstall
echo "Memastikan semua dependensi terinstall..."
npm install

# 5. Build aplikasi
echo "Membuild aplikasi..."
npm run build

# 6. Periksa hasil build
if [ ! -d "dist" ]; then
  echo "ERROR: Direktori dist tidak ditemukan setelah build!"
  exit 1
fi

if [ ! -f "dist/index.js" ]; then
  echo "ERROR: File dist/index.js tidak ditemukan setelah build!"
  exit 1
fi

echo "Build berhasil. Aplikasi siap untuk diunggah ke Domainesia."
echo ""
echo "PETUNJUK DEPLOYMENT:"
echo "1. ZIP semua file termasuk dist/, node_modules/, .env, .htaccess, dan start.js"
echo "2. Upload ZIP ke direktori public_html di Domainesia"
echo "3. Extract ZIP di server Domainesia"
echo "4. Pastikan izin file dan direktori sudah benar (755 untuk direktori, 644 untuk file)"
echo ""
echo "Proses persiapan selesai!"

exit 0