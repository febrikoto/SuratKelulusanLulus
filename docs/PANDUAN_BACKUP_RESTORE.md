# Panduan Backup dan Restore Database SKL System

Dokumen ini berisi panduan lengkap untuk melakukan backup dan restore database pada aplikasi SKL System. Terdapat dua metode backup yang tersedia: backup SQL dan backup JSON.

## Daftar Isi
1. [Persiapan](#1-persiapan)
2. [Melakukan Backup](#2-melakukan-backup)
3. [Melakukan Restore](#3-melakukan-restore)
4. [Troubleshooting](#4-troubleshooting)
5. [FAQ](#5-faq)

## 1. Persiapan

### Persyaratan
- Node.js (versi 16 atau lebih tinggi)
- PostgreSQL client (untuk backup SQL)
- Koneksi database yang benar (variabel lingkungan DATABASE_URL)

### Variabel Lingkungan
Pastikan variabel lingkungan untuk koneksi database sudah dikonfigurasi dengan benar di file `.env`:

```
DATABASE_URL=postgresql://username:password@hostname:port/database_name
PGUSER=username
PGPASSWORD=password
PGHOST=hostname
PGPORT=port
PGDATABASE=database_name
```

## 2. Melakukan Backup

### Menggunakan Script backup-db.sh

Script ini akan membuat 3 jenis backup secara otomatis:
1. Backup schema database (struktur tabel tanpa data)
2. Backup data saja (data tanpa struktur tabel)
3. Backup lengkap (schema + data)
4. Backup JSON (format JSON untuk kemudahan import)

Cara penggunaan:

```bash
# Di server hosting (Domainesia)
./backup-db.sh
```

Script akan menyimpan file backup di folder `backup/sql/` dan `backup/data/` dengan format nama yang mengandung timestamp.

### Backup Manual Dengan PostgreSQL

Jika Anda ingin melakukan backup manual menggunakan PostgreSQL, gunakan perintah berikut:

```bash
# Backup schema saja
PGPASSWORD=password pg_dump -h hostname -p port -U username -d database_name --schema-only > schema_backup.sql

# Backup data saja
PGPASSWORD=password pg_dump -h hostname -p port -U username -d database_name --data-only > data_backup.sql

# Backup lengkap (schema + data)
PGPASSWORD=password pg_dump -h hostname -p port -U username -d database_name > full_backup.sql
```

### Backup JSON dengan Script

Untuk membuat backup dalam format JSON, gunakan script `export_database.js`:

```bash
# Export ke file default (backup/data/full_export_timestamp.json)
node scripts/export_database.js

# Export ke file tertentu
node scripts/export_database.js path/to/backup.json
```

## 3. Melakukan Restore

### Menggunakan Script restore-from-backup.sh

Script ini dapat melakukan restore dari file backup SQL atau JSON:

```bash
# Restore dari backup SQL
./restore-from-backup.sh -f backup/sql/full_backup_20250402_123456.sql

# Restore dari backup JSON
./restore-from-backup.sh -f backup/data/full_export_20250402T12-34-56.json

# Restore schema saja
./restore-from-backup.sh -f backup/sql/schema_20250402_123456.sql -s
```

Untuk melihat semua opsi yang tersedia:

```bash
./restore-from-backup.sh --help
```

### Restore Manual dengan PostgreSQL

Jika Anda ingin melakukan restore manual menggunakan PostgreSQL, gunakan perintah berikut:

```bash
# Restore dari file SQL
PGPASSWORD=password psql -h hostname -p port -U username -d database_name -f backup_file.sql
```

### Restore dari JSON dengan Script

Untuk restore dari backup JSON, gunakan script `import_database.js`:

```bash
node scripts/import_database.js path/to/backup.json
```

## 4. Troubleshooting

### Error: pg_dump command not found
Pastikan PostgreSQL client terinstal pada sistem Anda. Pada Domainesia hosting, PostgreSQL client sudah terinstal secara default.

### Error: Could not connect to database
- Periksa kembali informasi koneksi database di file `.env`
- Pastikan pengguna database memiliki hak akses yang cukup
- Periksa apakah database server dapat diakses (tidak ada masalah firewall atau jaringan)

### Error saat restore: Role/User tidak ada
Jika terjadi error tentang role atau user yang tidak ada saat restore, buat terlebih dahulu user tersebut:

```sql
CREATE ROLE username WITH LOGIN PASSWORD 'password';
```

## 5. FAQ

### Q: Seberapa sering saya harus melakukan backup?
A: Disarankan untuk melakukan backup setiap hari atau setelah ada perubahan data yang signifikan. Untuk lingkungan produksi, sebaiknya jadwalkan backup otomatis menggunakan cron job.

### Q: Apakah saya perlu backup jika menggunakan Supabase?
A: Ya, tetap disarankan untuk melakukan backup meskipun menggunakan Supabase. Ini untuk mengantisipasi kejadian tidak terduga seperti kesalahan penghapusan data atau masalah pada layanan cloud.

### Q: Bagaimana cara menjadwalkan backup otomatis?
A: Anda dapat menggunakan cron job untuk menjalankan script backup secara berkala:

```bash
# Menjalankan backup setiap hari pada pukul 2 pagi
0 2 * * * cd /path/to/app && ./backup-db.sh
```

### Q: Apakah saya bisa memindahkan data dari satu server ke server lain?
A: Ya, Anda dapat menggunakan file backup (SQL atau JSON) untuk memindahkan data dari satu server ke server lain. Pastikan struktur skema database pada kedua server kompatibel.

---

Jika Anda memiliki pertanyaan atau masalah lain seputar backup dan restore database, silakan hubungi administrator sistem.