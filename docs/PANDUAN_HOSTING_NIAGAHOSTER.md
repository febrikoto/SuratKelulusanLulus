# Panduan Hosting Aplikasi SKL Di Niagahoster

## Persiapan Deployment

Berikut adalah langkah-langkah yang perlu dilakukan untuk menghosting aplikasi SKL di Niagahoster atau hosting Node.js lainnya:

### 1. Mengekspor Database dari Replit

Ekspor database dari Replit menggunakan script `export_database.js`:

```bash
node scripts/export_database.js
```

File ekspor akan disimpan di folder `backup/data` dengan format `full_export_YYYY-MM-DD-HH-mm-ss.json`.

### 2. Konfigurasi Hosting Niagahoster

1. Login ke Niagahoster dan buka Member Area
2. Pilih layanan hosting (sebaiknya NodeJS Hosting)
3. Buka pengaturan Node.js Application:
   - Versi Node.js: 18.x.x (minimal v18.20.6)
   - Application Mode: Production
   - Startup File: start.js

### 3. Konfigurasi Environment Variables

Atur variabel lingkungan berikut di panel Niagahoster:

```
NODE_ENV=production
PORT=3000
DATABASE_URL=postgres://username:password@hostname:port/database_name
PGUSER=username
PGPASSWORD=password
PGDATABASE=database_name
PGHOST=hostname
PGPORT=port
SESSION_SECRET=gunakan_random_string_yang_panjang
```

Database postgres bisa menggunakan layanan seperti Supabase, Neon, atau penyedia database PostgreSQL lainnya.

### 4. Upload File Aplikasi

1. Zip semua folder dan file aplikasi kecuali folder `node_modules` dan `.git`
2. Upload file zip ke hosting melalui FTP atau panel hosting
3. Ekstrak file zip ke root hosting

### 5. Konfigurasi File .htaccess

Pastikan file `.htaccess` sudah tersedia dengan isi:

```
# Redirect all traffic to Node.js application
<IfModule mod_rewrite.c>
RewriteEngine On
RewriteRule ^(.*)$ http://127.0.0.1:3000/$1 [P,L]
</IfModule>
```

### 6. Inisialisasi Database

Jalankan script inisialisasi database:

```bash
node scripts/restore_database.js
```

Script ini akan membuat tabel, indeks, dan user admin awal.

### 7. Import Data

Jika ingin mengimpor data dari backup Replit:

```bash
node scripts/import_database_raw.js path/to/exported_data.json
```

## Masalah Umum dan Solusinya

### 1. Error 503 Service Unavailable

Kemungkinan penyebab:
- Aplikasi Node.js belum berjalan
- Port yang digunakan tidak sesuai dengan konfigurasi
- File start.js tidak ditemukan

Solusi:
- Periksa log aplikasi di panel hosting
- Pastikan file start.js ada di root folder
- Cek apakah port di .htaccess sesuai dengan PORT di environment variables

### 2. Database Connection Error

Kemungkinan penyebab:
- Kredensial database salah
- Firewall memblokir koneksi
- Database belum dibuat

Solusi:
- Periksa kredensial database di environment variables
- Pastikan database sudah dibuat
- Pastikan IP hosting diizinkan di firewall database

### 3. Error "Cannot find module"

Kemungkinan penyebab:
- Package belum terinstall
- Package.json tidak lengkap

Solusi:
- Jalankan `npm install` di server hosting
- Pastikan semua dependencies sudah terdaftar di package.json

## Backup Berkala

Lakukan backup database secara berkala:

```bash
node scripts/export_database.js
```

File backup akan tersimpan di folder `backup/data/`.

## Akses Admin Default

Setelah instalasi, akses admin default adalah:
- Username: admin
- Password: admin123

**Penting:** Segera ubah password admin setelah berhasil login pertama kali.

## Panduan Import Siswa & Nilai

Untuk cara import data siswa dan nilai, silahkan lihat pada bagian Admin Panel, menu Import Data.

Ada dua cara import:

1. Import Siswa (File Excel)
2. Import Nilai (File Excel)

Format file Excel harus sesuai dengan template yang dapat diunduh dari aplikasi.

## Informasi Tambahan

- Aplikasi SKL menggunakan React.js di frontend dan Express.js di backend
- Database menggunakan PostgreSQL dengan Drizzle ORM
- Server Express berjalan di port 3000 secara default
- Aplikasi mendukung pembuatan sertifikat dengan atau tanpa nilai
- Konfigurasi template sertifikat bisa diatur di halaman Pengaturan Sekolah