# Panduan Upgrade Aplikasi SKL

Dokumen ini berisi petunjuk untuk mengupgrade aplikasi SKL ke versi terbaru dengan aman.

## Sebelum Upgrade

1. Buat backup data Anda dengan menjalankan:
   ```
   bash scripts/backup.sh
   ```
   
2. Pastikan Anda memiliki cukup ruang disk tersedia untuk proses upgrade.

3. Periksa persyaratan sistem versi baru yang mungkin berubah.

## Proses Upgrade

### Upgrade Minor (Patch)

Untuk upgrade minor yang tidak mengubah struktur database:

1. Backup data
   ```
   bash scripts/backup.sh
   ```

2. Update kode sumber
   ```
   # Jika menggunakan git
   git pull origin main
   
   # Atau extract file zip versi terbaru ke folder aplikasi
   # (backup file konfigurasi .env terlebih dahulu)
   ```

3. Install dependensi yang mungkin berubah
   ```
   npm install
   ```

4. Restart aplikasi
   ```
   pm2 restart skl-app
   # Atau cara restart lain yang Anda gunakan
   ```

### Upgrade Major (Dengan Perubahan Database)

Untuk upgrade yang melibatkan perubahan struktur database:

1. Backup data lengkap
   ```
   bash scripts/backup.sh
   ```

2. Catat versi aplikasi saat ini (untuk rollback jika diperlukan)

3. Update kode sumber ke versi baru

4. Jalankan migrasi database
   ```
   # Script migrasi akan disediakan dalam rilis
   node scripts/migrate-vX-to-vY.js
   ```

5. Restart aplikasi
   ```
   npm run build
   pm2 restart skl-app
   ```

6. Verifikasi aplikasi berjalan dengan benar
   - Login sebagai admin
   - Periksa data siswa dan sertifikat
   - Coba buat sertifikat baru

## Rollback

Jika terjadi masalah setelah upgrade:

1. Kembali ke kode sumber versi sebelumnya

2. Restore database dari backup
   ```
   bash scripts/restore-from-backup.sh ./backup/data/full_export_YYYYMMDD-HHMMSS.json
   ```

3. Restore folder uploads jika diperlukan
   ```
   tar -xzf ./backup/data/uploads-YYYYMMDD-HHMMSS.tar.gz -C ./
   ```

4. Restart aplikasi
   ```
   npm run build
   pm2 restart skl-app
   ```

## Catatan Penting

- Selalu buat backup sebelum upgrade
- Lakukan upgrade pada waktu penggunaan rendah
- Uji fitur-fitur kritis setelah upgrade
- Jika menggunakan PM2, pastikan config disesuaikan jika ada perubahan struktur aplikasi

Untuk bantuan lebih lanjut, hubungi tim pengembang aplikasi.