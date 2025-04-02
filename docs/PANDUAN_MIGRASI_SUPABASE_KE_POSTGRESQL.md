# Panduan Migrasi Database dari Supabase ke PostgreSQL Lokal di Domainesia

Panduan ini akan membantu Anda memindahkan data dari database Supabase ke PostgreSQL lokal yang dihosting di Domainesia. Proses ini berguna saat ingin memindahkan aplikasi dari lingkungan pengembangan ke produksi.

## Daftar Isi
1. [Persiapan](#1-persiapan)
2. [Ekspor Data dari Supabase](#2-ekspor-data-dari-supabase)
3. [Persiapan Database Domainesia](#3-persiapan-database-domainesia)
4. [Impor Data ke PostgreSQL Domainesia](#4-impor-data-ke-postgresql-domainesia)
5. [Verifikasi Migrasi](#5-verifikasi-migrasi)
6. [Pengaturan Aplikasi](#6-pengaturan-aplikasi)
7. [Troubleshooting](#7-troubleshooting)

## 1. Persiapan

### Persyaratan
- Akses ke database Supabase (URL dan kunci API)
- Akses SSH ke hosting Domainesia
- Akses ke database PostgreSQL di Domainesia
- Node.js terinstal di komputer lokal dan server Domainesia

### Informasi Koneksi

Siapkan informasi koneksi untuk kedua database:

**Supabase:**
```
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

**PostgreSQL Domainesia:**
```
PGUSER=username
PGPASSWORD=password
PGHOST=localhost
PGPORT=5432
PGDATABASE=database_name
DATABASE_URL=postgresql://username:password@localhost:5432/database_name
```

## 2. Ekspor Data dari Supabase

### Metode 1: Menggunakan Script Export

1. Pastikan Anda memiliki file `.env` dengan kredensial Supabase yang benar:

```
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

2. Jalankan script ekspor:

```bash
# Pastikan Anda di direktori root aplikasi
node scripts/export_database.js backup/data/supabase_export.json
```

3. Verifikasi file ekspor:

```bash
ls -la backup/data/supabase_export.json
cat backup/data/supabase_export.json | head -n 20
```

### Metode 2: Menggunakan Supabase Dashboard

1. Login ke dashboard Supabase
2. Pilih project Anda
3. Buka menu "Database" > "SQL"
4. Jalankan query ekspor untuk setiap tabel:

```sql
-- Export users table
SELECT * FROM users;

-- Export students table
SELECT * FROM students;

-- Export settings table
SELECT * FROM settings;

-- Export grades table
SELECT * FROM grades;

-- Export subjects table
SELECT * FROM subjects;
```

5. Untuk setiap hasil query, klik "Download" dan pilih format JSON atau CSV
6. Simpan file ekspor untuk digunakan nanti

## 3. Persiapan Database Domainesia

### Login ke Panel cPanel Domainesia

1. Login ke cPanel hosting Domainesia
2. Navigasi ke bagian "Databases" > "PostgreSQL Databases"
3. Buat database baru jika belum ada
4. Buat user database baru jika belum ada
5. Tambahkan user ke database dan berikan hak akses penuh

### Koneksi ke Database PostgreSQL

SSH ke server Domainesia dan tes koneksi database:

```bash
ssh username@hostname

# Setelah terhubung ke server
psql -h localhost -U db_username -d db_name
```

### Siapkan Skema Database

1. Buat file skema pada server Domainesia:

```bash
cd www/nama-domain.com/public_html
node scripts/create-supabase-schema.js
```

atau

```bash
node scripts/restore_database.js
```

Ini akan membuat struktur tabel yang diperlukan di database PostgreSQL lokal.

## 4. Impor Data ke PostgreSQL Domainesia

### Upload File Ekspor ke Server

Gunakan SFTP atau SCP untuk mengunggah file ekspor JSON:

```bash
# Dari komputer lokal
scp backup/data/supabase_export.json username@hostname:/path/to/domain/backup/data/
```

### Impor Data Menggunakan Script

SSH ke server Domainesia dan jalankan script impor:

```bash
ssh username@hostname

# Setelah terhubung ke server
cd www/nama-domain.com/public_html

# Pastikan variabel lingkungan database lokal sudah diatur dengan benar di .env
# DATABASE_URL=postgresql://username:password@localhost:5432/database_name

# Jalankan script impor
node scripts/import_database.js backup/data/supabase_export.json
```

## 5. Verifikasi Migrasi

### Periksa Data yang Diimpor

Periksa apakah data berhasil diimpor dengan benar:

```bash
# Koneksi ke database PostgreSQL
psql -h localhost -U db_username -d db_name

# Periksa jumlah baris untuk setiap tabel
SELECT COUNT(*) FROM users;
SELECT COUNT(*) FROM students;
SELECT COUNT(*) FROM settings;
SELECT COUNT(*) FROM grades;
SELECT COUNT(*) FROM subjects;

# Periksa data contoh dari setiap tabel
SELECT * FROM users LIMIT 5;
SELECT * FROM students LIMIT 5;
SELECT * FROM settings LIMIT 1;
```

### Validasi Relasi Database

Verifikasi relasi antara tabel:

```sql
-- Verifikasi relasi user-student
SELECT u.username, u.full_name, s.nisn, s.full_name 
FROM users u 
JOIN students s ON u.student_id = s.id 
LIMIT 10;

-- Verifikasi relasi student-grades
SELECT s.nisn, s.full_name, g.subject_name, g.value 
FROM students s 
JOIN grades g ON g.student_id = s.id 
LIMIT 10;
```

## 6. Pengaturan Aplikasi

### Update File .env

Pastikan file `.env` diperbarui dengan kredensial database lokal:

```
# Database Domainesia
DATABASE_URL=postgresql://username:password@localhost:5432/database_name
PGUSER=username
PGPASSWORD=password
PGHOST=localhost
PGPORT=5432
PGDATABASE=database_name

# Pengaturan aplikasi lainnya
SESSION_SECRET=your_session_secret
NODE_ENV=production
PORT=3000
```

### Update Service Worker

Pastikan aplikasi terhubung ke database lokal:

```bash
# Restart aplikasi Node.js
cd www/nama-domain.com/public_html
pm2 restart all
# atau
node start.js
```

## 7. Troubleshooting

### Error: Connection Refused

Jika koneksi ke database ditolak:

1. Periksa kredensial database di file `.env`
2. Pastikan PostgreSQL berjalan dan menerima koneksi dari localhost
3. Periksa pengaturan firewall (biasanya tidak masalah untuk koneksi lokal)

### Error: Permission Denied

Jika terjadi error izin saat mengakses database:

1. Periksa apakah user database memiliki hak akses yang cukup
2. Periksa izin pada file dan direktori aplikasi

```bash
# Berikan izin yang benar pada direktori aplikasi
chmod -R 755 www/nama-domain.com/public_html
```

### Error: Schema Tidak Konsisten

Jika skema database tidak konsisten:

1. Bandingkan struktur tabel di kedua database
2. Jalankan script pembuatan skema lagi jika diperlukan
3. Pastikan versi aplikasi kompatibel dengan struktur database

### Duplikasi Data

Jika terdapat data duplikat setelah migrasi:

1. Gunakan opsi `--clean` atau hapus data terlebih dahulu:

```sql
-- Hapus data dari tabel dalam urutan yang benar (perhatikan dependensi foreign key)
TRUNCATE grades CASCADE;
TRUNCATE users CASCADE;
TRUNCATE students CASCADE;
TRUNCATE settings CASCADE;
TRUNCATE subjects CASCADE;
```

2. Kemudian jalankan impor lagi

---

Untuk bantuan lebih lanjut, silakan hubungi tim teknis atau administrator sistem.