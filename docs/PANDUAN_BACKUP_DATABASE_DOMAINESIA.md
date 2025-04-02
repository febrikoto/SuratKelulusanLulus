# Panduan Backup Database di Hosting Domainesia

Dokumen ini berisi panduan khusus untuk melakukan backup dan restore database pada aplikasi SKL System di lingkungan hosting Domainesia.

## Daftar Isi
1. [Persiapan](#1-persiapan)
2. [Backup Database](#2-backup-database)
3. [Restore Database](#3-restore-database)
4. [Backup Otomatis](#4-backup-otomatis)
5. [Troubleshooting](#5-troubleshooting)

## 1. Persiapan

### Akses SSH ke Server

Untuk melakukan backup dan restore database, Anda perlu akses SSH ke server Domainesia. Jika belum memiliki akses SSH, ikuti langkah berikut:

1. Login ke panel kontrol Domainesia
2. Pilih menu "SSH & Shell Access"
3. Klik "Enable SSH Access" jika belum diaktifkan
4. Catat username dan password SSH

### Menghubungkan ke Server via SSH

```bash
ssh username@hostname
```

Ganti `username` dengan username SSH Anda dan `hostname` dengan nama host domain Anda.

### Navigasi ke Direktori Aplikasi

```bash
cd www/nama-domain.com/public_html
# atau lokasi lain sesuai pengaturan Anda
```

### Periksa Variabel Lingkungan

Pastikan file `.env` sudah terkonfigurasi dengan benar:

```bash
cat .env
```

Pastikan variabel database sudah benar:

```
DATABASE_URL=postgresql://username:password@localhost:5432/nama_database
PGUSER=username
PGPASSWORD=password
PGHOST=localhost
PGPORT=5432
PGDATABASE=nama_database
```

## 2. Backup Database

### Menggunakan Script Backup

Script backup-db.sh otomatis akan membuat backup dalam format SQL dan JSON.

```bash
# Pastikan script bisa dieksekusi
chmod +x backup-db.sh

# Jalankan script backup
./backup-db.sh
```

File backup akan disimpan di folder `backup/sql/` dan `backup/data/`. Buka folder tersebut untuk melihat hasil backup:

```bash
ls -la backup/sql/
ls -la backup/data/
```

### Mengunduh File Backup ke Komputer Lokal

Setelah backup selesai, Anda dapat mengunduh file backup ke komputer lokal menggunakan SFTP:

1. Gunakan FileZilla atau klien SFTP lainnya untuk terhubung ke server
2. Navigasi ke folder `backup/sql/` dan `backup/data/`
3. Unduh file backup yang diinginkan ke komputer lokal

Atau dengan menggunakan perintah scp dari terminal lokal:

```bash
# Dari komputer lokal
scp username@hostname:/path/to/domain/backup/sql/full_backup_*.sql ~/Downloads/
scp username@hostname:/path/to/domain/backup/data/full_export_*.json ~/Downloads/
```

## 3. Restore Database

### Mengunggah File Backup ke Server

Jika Anda ingin merestore database dari file backup yang ada di komputer lokal, unggah terlebih dahulu file tersebut ke server:

1. Gunakan FileZilla atau klien SFTP untuk terhubung ke server
2. Unggah file backup ke folder `backup/sql/` atau `backup/data/`

Atau dengan menggunakan perintah scp dari terminal lokal:

```bash
# Dari komputer lokal
scp ~/Downloads/backup_file.sql username@hostname:/path/to/domain/backup/sql/
scp ~/Downloads/backup_file.json username@hostname:/path/to/domain/backup/data/
```

### Melakukan Restore Database

Gunakan script restore-from-backup.sh untuk melakukan restore database:

```bash
# Pastikan script bisa dieksekusi
chmod +x restore-from-backup.sh

# Restore dari file SQL
./restore-from-backup.sh -f backup/sql/full_backup_20250402_123456.sql

# Restore dari file JSON
./restore-from-backup.sh -f backup/data/full_export_20250402T12-34-56.json
```

## 4. Backup Otomatis

Anda dapat mengatur backup otomatis menggunakan cron job di Domainesia:

1. Buat file script untuk backup otomatis:

```bash
nano auto-backup.sh
```

2. Isi file dengan konten berikut:

```bash
#!/bin/bash
# Script backup otomatis untuk SKL System

# Navigasi ke direktori aplikasi
cd /home/username/www/nama-domain.com/public_html

# Jalankan backup
./backup-db.sh

# Hapus backup lama (opsional, lebih dari 30 hari)
find ./backup/sql/ -name "*.sql" -type f -mtime +30 -delete
find ./backup/data/ -name "*.json" -type f -mtime +30 -delete

# Kirim notifikasi (opsional)
echo "Backup database SKL System berhasil dilakukan pada $(date)" | mail -s "Backup Database Berhasil" email@anda.com
```

3. Buat script dapat dieksekusi:

```bash
chmod +x auto-backup.sh
```

4. Tambahkan ke crontab:

```bash
crontab -e
```

5. Tambahkan baris berikut untuk backup setiap hari pada pukul 2 pagi:

```
0 2 * * * /home/username/www/nama-domain.com/public_html/auto-backup.sh >> /home/username/backup.log 2>&1
```

6. Simpan dan keluar dari editor.

## 5. Troubleshooting

### Error: Permission Denied

Jika terjadi error permission saat menjalankan script:

```bash
# Pastikan script memiliki izin eksekusi
chmod +x backup-db.sh
chmod +x restore-from-backup.sh
```

### Error: Database Connection

Jika terjadi error koneksi database:

1. Periksa kredensial database di file `.env`
2. Pastikan database PostgreSQL sudah berjalan
3. Periksa apakah user database memiliki hak akses yang cukup

```bash
# Periksa apakah PostgreSQL berjalan
ps aux | grep postgres

# Periksa koneksi database
psql -h localhost -U username -d database_name -c "SELECT version();"
```

### Error: Command Not Found

Jika terjadi error command not found untuk perintah Node.js atau PostgreSQL:

```bash
# Periksa lokasi Node.js
which node
which npm

# Periksa lokasi PostgreSQL
which psql
which pg_dump

# Gunakan path lengkap jika diperlukan
/usr/local/bin/node scripts/export_database.js
```

### Periksa Log Aplikasi

Untuk memeriksa log aplikasi:

```bash
# Log aplikasi Node.js
tail -f logs/app.log

# Log sistem untuk layanan PostgreSQL
sudo tail -f /var/log/postgresql/postgresql-*.log
```

---

Jika Anda memerlukan bantuan lebih lanjut, silakan hubungi administrator sistem atau tim Domainesia Support.