# Panduan Instalasi Aplikasi SKL

## Pendahuluan

Aplikasi SKL (Surat Keterangan Lulus) adalah sistem manajemen sertifikat kelulusan yang memudahkan sekolah untuk membuat, menerbitkan, dan mengelola sertifikat kelulusan dengan aman. Aplikasi ini mendukung pembuatan sertifikat dengan nilai dan tanpa nilai, serta memiliki fitur verifikasi untuk memastikan keaslian sertifikat.

## Persyaratan Sistem

- Node.js versi 18 atau lebih baru
- PostgreSQL Database Server
- NPM atau Yarn sebagai package manager
- Sistem operasi: Windows, Linux, atau macOS dengan akses internet

## Instalasi

### 1. Persiapan Server

1. Install Node.js dan NPM dari [situs resmi Node.js](https://nodejs.org/)
2. Install PostgreSQL dari [situs resmi PostgreSQL](https://www.postgresql.org/download/)
3. Buat database kosong untuk aplikasi SKL

### 2. Menyiapkan Aplikasi

1. Extract file ZIP aplikasi ke folder tujuan
2. Salin file `backup/database_variables.env` ke folder root aplikasi dan rename menjadi `.env`
3. Edit file `.env` dan sesuaikan dengan konfigurasi database Anda:
   ```
   DATABASE_URL=postgres://username:password@localhost:5432/nama_database
   PGHOST=localhost
   PGPORT=5432
   PGUSER=username
   PGPASSWORD=password
   PGDATABASE=nama_database
   SESSION_SECRET=kunci_rahasia_yang_aman
   ```

### 3. Instalasi Dependensi

Buka terminal/command prompt di folder aplikasi dan jalankan:
```
npm install
```

### 4. Inisialisasi Database

Jalankan script restorasi database untuk membuat struktur tabel dan user admin awal:
```
node scripts/restore_database.js
```

### 5. Memulai Aplikasi

Untuk mode development:
```
npm run dev
```

Untuk mode production:
```
npm run build
npm start
```

Aplikasi akan berjalan pada http://localhost:3000 (atau port yang dikonfigurasi)

## Penggunaan Aplikasi

### Akun Default
- Admin: username `admin`, password `admin123` (Segera ganti setelah login pertama!)

### Fitur Utama
1. **Manajemen Siswa**
   - Import data siswa dari Excel/CSV
   - Verifikasi status kelulusan siswa
   - Pengaturan data siswa per jurusan

2. **Pengaturan Sekolah**
   - Logo sekolah dan kementerian
   - Data kepala sekolah
   - Format kop surat (teks atau gambar)
   - Tanda tangan dan stempel sekolah

3. **Pembuatan Sertifikat**
   - SKL dengan nilai
   - SKL tanpa nilai
   - Kustomisasi teks sertifikat
   - Pencetakan dengan QR code

4. **Manajemen Mata Pelajaran**
   - Pengelompokan mata pelajaran
   - Pengaturan mata pelajaran per jurusan
   - Import nilai dari Excel

## Backup dan Restore Data

### Cara Backup Data
Untuk membuat backup database dalam format JSON:
```
node scripts/export_database.js
```
File backup akan tersimpan di folder `backup/data/`

### Cara Restore Data
Untuk mengembalikan data dari file backup:
```
node scripts/import_database.js path/to/backup_file.json
```

## Troubleshooting

### Masalah Koneksi Database
- Pastikan PostgreSQL berjalan dan dapat diakses
- Verifikasi kredensial database di file `.env`
- Periksa log error di console untuk detail masalah

### Masalah Upload File
- Pastikan folder `uploads` dan subfoldernya memiliki izin tulis
- Jika folder tidak ada, buat secara manual:
  ```
  mkdir -p uploads/logos uploads/signatures uploads/stamps uploads/letterheads
  chmod -R 755 uploads
  ```

### Masalah Import Data
- Format Excel harus sesuai dengan template
- Cek kolom NISN tidak boleh duplikat
- Pastikan format tanggal sesuai (YYYY-MM-DD)

## Kontak Pengembang

Jika Anda mengalami masalah yang tidak tercantum dalam panduan ini, silakan hubungi tim pengembang untuk mendapatkan bantuan lebih lanjut.