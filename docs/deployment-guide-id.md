# Panduan Backup dan Deployment Aplikasi SKL

## Backup Aplikasi Secara Offline

### 1. Backup Menggunakan Script

Anda dapat menggunakan script backup yang telah disediakan untuk membuat backup lengkap aplikasi dan database:

```bash
bash scripts/backup.sh
```

Script ini akan membuat:
- File ZIP berisi kode aplikasi (tanpa node_modules)
- File SQL berisi dump database PostgreSQL

File backup akan disimpan di folder `backup/` dengan timestamp.

### 2. Backup Data dalam Format JSON (Alternatif)

Jika Anda tidak dapat mengakses database PostgreSQL secara langsung, gunakan script export data:

```bash
node scripts/export_database.js
```

Script ini akan mengekspor semua data dari database ke file JSON di folder `backup/data/`.

## Memindahkan ke Hosting

### 1. Persiapan Hosting

Hosting Anda harus mendukung:
- Node.js (versi 18 atau lebih baru)
- PostgreSQL
- NPM dan build tools

### 2. Upload Kode Aplikasi

1. Transfer file ZIP hasil backup ke hosting menggunakan FTP, SFTP, atau panel kontrol hosting
2. Extract file ZIP ke direktori root hosting
3. Instal dependensi:
   ```bash
   npm install
   ```
4. Build aplikasi:
   ```bash
   npm run build
   ```

### 3. Setup Database

#### Metode 1: Menggunakan File SQL
1. Buat database baru di hosting
2. Import file SQL backup ke database baru:
   ```bash
   psql [DATABASE_URL_HOSTING] < backup/skl_database_[timestamp].sql
   ```

#### Metode 2: Menggunakan File JSON
1. Buat database baru di hosting
2. Sesuaikan variabel lingkungan untuk koneksi database
3. Lakukan restorasi schema:
   ```bash
   node scripts/restore_database.js
   ```
4. Import data dari file JSON:
   ```bash
   node scripts/import_database.js backup/data/full_export_[timestamp].json
   ```

### 4. Konfigurasi Environment Variables

Tambahkan variabel lingkungan berikut ke hosting:

```
DATABASE_URL=postgresql://username:password@hostname:port/database
PGHOST=hostname
PGPORT=5432
PGUSER=username
PGPASSWORD=password
PGDATABASE=database
NODE_ENV=production
SESSION_SECRET=random_string_panjang_untuk_keamanan
```

### 5. Menjalankan Aplikasi

Pada sebagian besar hosting Node.js, gunakan perintah:

```bash
npm start
```

Beberapa hosting memiliki cara khusus untuk menjalankan aplikasi, seperti melalui panel kontrol atau file konfigurasi.

## Troubleshooting

### Masalah Database

Jika ada masalah dengan koneksi database:

1. Verifikasi bahwa variabel lingkungan database sudah benar
2. Cek apakah database dapat diakses dari server hosting
3. Jalankan script restore database:
   ```bash
   node scripts/restore_database.js
   ```

### Masalah Upload File

Jika ada masalah dengan upload file (logo, tanda tangan, dll):

1. Pastikan direktori `uploads` memiliki permission yang benar (biasanya 755)
2. Buat folder uploads jika belum ada:
   ```bash
   mkdir -p uploads/logos uploads/signatures uploads/stamps uploads/letterheads
   chmod -R 755 uploads
   ```

### Masalah Generasi PDF

Jika ada masalah dengan generasi PDF:

1. Pastikan PDFKit dan dependensi terkait terinstal dengan benar
2. Verifikasi bahwa server hosting mendukung operasi file untuk membuat PDF

## Backup Reguler

Setelah aplikasi berjalan di hosting, lakukan backup berkala:

1. Jalankan script backup secara reguler (bisa diatur melalui cron job)
2. Simpan backup di tempat yang aman dan terpisah dari hosting

## Penting: Keamanan

1. Ganti password default (admin/admin123) setelah instalasi
2. Gunakan HTTPS untuk keamanan data
3. Lindungi direktori uploads dari akses langsung melalui web dengan aturan .htaccess atau konfigurasi server