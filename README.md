# SKL (Surat Keterangan Lulus) SMKN 1 Lubuk Sikaping

Aplikasi pengelolaan Surat Keterangan Lulus (SKL) untuk SMKN 1 Lubuk Sikaping.

## Fitur Utama

- **Manajemen Siswa dan Nilai**: Import data siswa dan nilai melalui Excel, pengaturan status kelulusan
- **Dua Model Sertifikat**: Dukungan untuk SKL dengan nilai dan SKL tanpa nilai
- **Tanda Tangan Digital (TTE)**: Dukungan untuk tanda tangan digital QR
- **Sistem Multi-Role**: Admin, Guru, dan Siswa memiliki hak akses berbeda
- **Customizable**: Pengaturan kop surat, tanda tangan, stempel, dll

## Panduan Deployment ke Niagahoster

### Prasyarat

1. Akun hosting Niagahoster dengan fitur Node.js (disarankan paket Unlimited Hosting atau VPS)
2. Database PostgreSQL (disarankan menggunakan Supabase)
3. Domain atau subdomain yang telah dikonfigurasi (contoh: skl.smkn1lubuksikaping.sch.id)

### Langkah Deployment

#### 1. Persiapan Database

1. Buat database PostgreSQL di [Supabase](https://supabase.com)
2. Catat informasi koneksi database:
   - DATABASE_URL
   - PGHOST
   - PGDATABASE
   - PGUSER
   - PGPASSWORD
   - PGPORT

#### 2. Persiapan File Deployment

1. Pastikan sudah melakukan build dengan menjalankan:
   ```
   ./prepare-for-deployment.sh
   ```
   Script ini akan:
   - Build frontend ke folder `dist/public`
   - Build backend ke `dist/index.js`
   - Membuat backup database terakhir (jika ada)

2. Upload file-file berikut ke direktori root hosting Niagahoster:
   - Folder `dist/` (seluruh isinya)
   - File `.env` (pastikan telah diisi dengan informasi koneksi database)
   - File `.htaccess`
   - File `start.js`
   - Folder `scripts/`
   - File `package.json`
   - File `package-lock.json`
   - Folder `uploads/` (jika telah ada file yang diupload)

#### 3. Konfigurasi di Niagahoster

1. Login ke Panel Niagahoster
2. Konfigurasi Node.js:
   - Pilih versi Node.js: 18.x atau yang lebih baru
   - Entry Point: `start.js`
   - Port: 3000 (sesuaikan dengan port yang dikonfigurasi di .htaccess)

3. Inisialisasi Database:
   Jalankan script inisialisasi dari terminal Niagahoster:
   ```
   cd /path/to/your/hosting
   node scripts/restore_database.js
   ```

#### 4. Konfigurasi Environment Variables

Pastikan file `.env` berisi variabel berikut:
```
# Database
DATABASE_URL=postgresql://username:password@host:port/dbname
PGHOST=host
PGDATABASE=dbname
PGUSER=username
PGPASSWORD=password
PGPORT=port

# Session
SESSION_SECRET=random_secret_key_minimal_32_karakter

# Web
PORT=3000
NODE_ENV=production
```

#### 5. Pengaturan Domain

1. Di panel Niagahoster, arahkan domain/subdomain ke direktori folder aplikasi
2. Pastikan SSL/HTTPS sudah diaktifkan untuk domain tersebut

### Pengujian Deployment

1. Buka alamat domain/subdomain di browser
2. Login dengan kredensial admin default:
   - Username: admin
   - Password: admin123

3. Segera ubah password admin default setelah berhasil login

### Backup dan Restore

#### Backup Database

Jalankan script backup untuk mengekspor data:
```
node scripts/export_database.js
```
File backup akan disimpan di folder `backup/` dengan format timestamp.

#### Restore Database

Untuk restore database dari file backup:
```
node scripts/import_database.js path/to/backup.json
```

### Migrasi ke Supabase

Untuk migrasi data dari database Postgres lokal ke Supabase, baca panduan lengkap di [docs/PANDUAN_IMPORT_SUPABASE.md](docs/PANDUAN_IMPORT_SUPABASE.md).

Panduan ini mencakup:
- Cara membuat skema database di Supabase
- Cara mengimpor data melalui SQL Editor Supabase
- Cara mengimpor data melalui API Supabase
- Troubleshooting masalah umum migrasi

### Troubleshooting

#### Masalah Koneksi Database
- Verifikasi kredensial database di file `.env`
- Pastikan IP server Niagahoster diizinkan di firewall Supabase
- Cek koneksi database dengan `node scripts/check_database.js`

#### Error 500 atau Aplikasi Tidak Berjalan
- Periksa log error di panel Niagahoster
- Pastikan file `start.js` memiliki permission execute (`chmod +x start.js`)
- Verifikasi Node.js sudah berjalan dengan benar

### Pembaruan Aplikasi

Untuk memperbarui aplikasi:
1. Build ulang dengan `./prepare-for-deployment.sh`
2. Upload ulang semua file yang diperbarui
3. Restart service Node.js dari panel Niagahoster

## Login Default

- **Admin**:
  - Username: admin
  - Password: admin123

- **Guru**:
  - Username: guru1
  - Password: guru123

- **Siswa**:
  - Username: siswa1
  - Password: siswa123

**Catatan**: Untuk siswa yang diimpor, NISN digunakan sebagai username dan password default.

## Informasi Tambahan

- Aplikasi dibuat menggunakan React.js, Express, dan PostgreSQL dengan Drizzle ORM
- Untuk bantuan lebih lanjut, hubungi pengembang melalui email atau kontak yang tersedia