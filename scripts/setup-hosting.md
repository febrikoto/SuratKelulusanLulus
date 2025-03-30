# Panduan Deployment Aplikasi SKL ke Hosting

## 1. Persiapan Backup

Sebelum memulai proses deployment, pastikan Anda telah memiliki backup aplikasi:
- File ZIP berisi seluruh kode aplikasi
- File SQL berisi backup database

Untuk membuat backup, jalankan script `backup.sh` di direktori utama aplikasi:

```bash
bash scripts/backup.sh
```

## 2. Persyaratan Hosting

Hosting untuk aplikasi SKL ini harus mendukung:
- Node.js versi 18 atau yang lebih baru
- Database PostgreSQL
- HTTPS (untuk keamanan)

## 3. Proses Upload ke Hosting

### A. Upload Kode Aplikasi
1. Extract file backup aplikasi (ZIP) ke komputer lokal
2. Upload semua file dan folder ke direktori root hosting menggunakan FTP, Git, atau panel kontrol hosting
3. Pastikan mengecualikan folder `node_modules`, `.git`, dan file backup lainnya

### B. Setup Database
1. Buat database PostgreSQL baru melalui panel kontrol hosting
2. Import file SQL backup database ke database baru yang telah dibuat
3. Catat informasi koneksi database: host, port, username, password, nama database

### C. Konfigurasi Environment Variables
Tambahkan variabel lingkungan berikut melalui panel kontrol hosting:
- `DATABASE_URL`: URL koneksi database PostgreSQL lengkap
- `PGHOST`: Hostname database
- `PGPORT`: Port database (biasanya 5432)
- `PGUSER`: Username database 
- `PGPASSWORD`: Password database
- `PGDATABASE`: Nama database
- `NODE_ENV`: production
- `SESSION_SECRET`: String random yang panjang untuk keamanan sesi

### D. Build dan Start Aplikasi
Di sebagian besar hosting, Anda perlu mengatur script build dan start:

1. Pastikan `package.json` memiliki script berikut:
```json
"scripts": {
  "build": "vite build",
  "start": "node server/index.js"
}
```

2. Jalankan perintah build dan start melalui panel kontrol hosting atau SSH:
```bash
npm install
npm run build
npm start
```

3. Beberapa hosting memerlukan konfigurasi tambahan, seperti file `Procfile` untuk Heroku atau konfigurasi PM2/Nginx untuk VPS

## 4. Pengaturan Domain dan SSL

1. Konfigurasikan domain untuk mengarah ke aplikasi
2. Aktifkan SSL/HTTPS (biasanya melalui Let's Encrypt di panel hosting)

## 5. Verifikasi Deployment

1. Buka website dengan domain yang telah dikonfigurasi
2. Periksa fungsi login dengan akun admin (admin/admin123)
3. Periksa fungsi-fungsi utama seperti:
   - Manajemen siswa
   - Manajemen guru
   - Pengaturan sekolah
   - Generasi sertifikat

## 6. Backup Reguler

Setelah aplikasi berjalan di hosting:
1. Lakukan backup database secara reguler
2. Simpan backup di tempat yang aman dan terpisah dari hosting

## Catatan Penting

- Pastikan server hosting mendukung operasi generasi file PDF
- Sesuaikan rute file upload agar sesuai dengan struktur direktori hosting
- Periksa permission file dan direktori jika ada masalah akses file