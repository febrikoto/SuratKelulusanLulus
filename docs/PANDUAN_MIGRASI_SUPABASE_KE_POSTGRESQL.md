# Panduan Migrasi dari Supabase ke PostgreSQL di Domainesia

Dokumen ini berisi langkah-langkah untuk migrasi database dari Supabase ke PostgreSQL lokal di Domainesia.

## Persiapan Sebelum Migrasi

1. **Backup Data dari Supabase**
   - Ekspor data menggunakan script `scripts/export_database.js`
   - Simpan file `full_export.json` yang dihasilkan

2. **Menyiapkan Kredensial Database Domainesia**
   - Buat file `env-for-domainesia.env` dengan kredensial database Domainesia:
     ```
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
     ```

## Langkah-Langkah Migrasi

### 1. Ekspor Data dari Supabase

```bash
# Pastikan .env berisi kredensial Supabase
npm run export-db
```

### 2. Persiapan Deployment ke Domainesia

```bash
# Jalankan script persiapan deployment
chmod +x prepare-for-deployment.sh
./prepare-for-deployment.sh
```

Script ini akan:
- Menyalin `env-for-domainesia.env` ke `.env`
- Membuat atau memastikan file `.htaccess` sudah ada
- Menginstall semua dependensi
- Build aplikasi

### 3. Deploy ke Domainesia

1. **ZIP Semua File yang Dibutuhkan**
   ```bash
   zip -r skl-app.zip dist/ node_modules/ .env .htaccess start.js package.json scripts/ shared/ server/ client/ uploads/
   ```

2. **Upload ZIP ke Domainesia**
   - Login ke cPanel Domainesia
   - Navigasi ke File Manager
   - Buka direktori `public_html`
   - Upload file ZIP
   - Extract file ZIP

3. **Setting Izin File**
   - Direktori: 755
   - File: 644
   - File eksekusi (sh): 755

### 4. Restore Database di Domainesia

1. **Upload File Backup**
   - Upload file `full_export.json` ke server

2. **Restore Database**
   ```bash
   cd public_html
   node scripts/import_database.js full_export.json
   ```

### 5. Verifikasi Migrasi

1. **Cek Akses Aplikasi**
   - Buka alamat website
   - Login dengan kredensial admin (admin/admin123)
   - Pastikan semua data dan fitur berfungsi dengan baik

2. **Cek Koneksi Database**
   ```bash
   node scripts/check_database.js
   ```

## Troubleshooting

### Masalah: ERROR CONNECTION REFUSED

Jika terjadi kesalahan "CONNECTION REFUSED", kemungkinan penyebabnya:

1. **Kredensial Database Salah**
   - Periksa kembali kredensial di file `.env`
   - Pastikan format Database URL sudah benar
   - Verifikasi username dan password database

2. **File .env Tidak Terupdate**
   - Jalankan kembali `cp env-for-domainesia.env .env`
   - Restart aplikasi

3. **Database Tidak Dapat Diakses dari Localhost**
   - Pastikan setting PostgreSQL di Domainesia mengizinkan koneksi dari localhost
   - Periksa firewall atau pembatasan akses database

### Masalah: Error Tabel Tidak Ditemukan

Jika terjadi error "relation does not exist":

1. **Schema Belum Ada**
   - Jalankan `node scripts/restore_database.js` untuk membuat ulang schema database

2. **Restore Database Gagal**
   - Periksa log error
   - Jalankan restore per tabel dengan `node scripts/import_database_raw.js full_export.json`

## Catatan Penting

- **Password Database**: Dalam connection string PostgreSQL, karakter khusus seperti `*` perlu di-encode menjadi `%2A` jika menggunakan format DATABASE_URL.
- **Node.js Version**: Pastikan menggunakan Node.js versi 18 di Domainesia.
- **Maintenance Mode**: Aktifkan maintenance mode di website sebelum melakukan migrasi untuk menghindari akses pengguna selama proses migrasi.