# Panduan Hosting Aplikasi SKL di DomaiNesia

Dokumen ini berisi petunjuk lengkap untuk meng-hosting aplikasi SKL di DomaiNesia menggunakan Node.js Hosting.

## Prasyarat

1. **Akun DomaiNesia dengan Node.js Hosting**
   - Pastikan paket hosting mendukung Node.js
   - Minimum Node.js versi 18.x

2. **Akses cPanel DomaiNesia**
   - Username dan password untuk login ke cPanel

3. **Database PostgreSQL**
   - Database PostgreSQL sudah dibuat melalui cPanel
   - Kredensial database (username, password, nama database)

## Langkah-Langkah Deployment

### 1. Persiapan File Aplikasi

Sebelum melakukan upload ke DomaiNesia, pastikan Anda memiliki:

1. **File .env dengan kredensial database DomaiNesia**
   ```
   # Database Configuration - DomaiNesia PostgreSQL
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

2. **File .htaccess untuk konfigurasi Passenger**
   ```
   <IfModule mod_rewrite.c>
     RewriteEngine On
     
     # Handle node application
     RewriteRule ^$ - [L]
     RewriteCond %{REQUEST_FILENAME} !-f
     RewriteCond %{REQUEST_FILENAME} !-d
     RewriteRule ^(.*)$ / [L,QSA]
   </IfModule>

   # DO NOT REMOVE - CLOUDLINUX PASSENGER CONFIGURATION BEGIN
   PassengerAppRoot /home/u7079808/public_html
   PassengerBaseURI /
   PassengerNodejs /home/u7079808/nodevenv/public_html/18/bin/node
   PassengerAppType node
   PassengerStartupFile start.js
   # DO NOT REMOVE - CLOUDLINUX PASSENGER CONFIGURATION END
   ```

3. **File start.js sebagai entry point**
   - Pastikan file `start.js` ada dan berfungsi sebagai entry point untuk Passenger

### 2. Upload Aplikasi ke DomaiNesia

1. **Build Aplikasi**
   ```bash
   npm run build
   ```

2. **ZIP Aplikasi**
   ```bash
   zip -r skl-app.zip dist/ node_modules/ .env .htaccess start.js package.json scripts/ shared/ server/ client/ uploads/
   ```

3. **Upload ZIP ke DomaiNesia**
   - Login ke cPanel DomaiNesia
   - Buka File Manager
   - Navigasi ke direktori `public_html`
   - Upload file ZIP
   - Extract file ZIP di direktori `public_html`

4. **Set Permissions**
   - Direktori: 755
   - File reguler: 644
   - File eksekusi (*.sh): 755

### 3. Setup Node.js di DomaiNesia

1. **Pilih Versi Node.js**
   - Di cPanel, buka "Setup Node.js App"
   - Pilih direktori `public_html`
   - Pilih Node.js versi 18.x
   - Set "Application URL" ke domain utama
   - Set "Application startup file" ke `start.js`
   - Klik "Create"

2. **Restart Node.js Application**
   - Setelah setup selesai, restart aplikasi Node.js dari panel "Setup Node.js App"

### 4. Setup Database

1. **Buat Database PostgreSQL**
   - Di cPanel, buka "PostgreSQL Databases"
   - Buat database baru, contoh: `anytimem_sklsmk`
   - Buat user database, contoh: `anytimem_skl`
   - Tambahkan user ke database dan berikan semua privileges

2. **Inisialisasi Database**
   - SSH ke server atau gunakan Terminal di cPanel (jika tersedia)
   - Jalankan script inisialisasi database:
     ```bash
     cd public_html
     NODE_ENV=production node scripts/restore_database.js
     ```

3. **Import Data (Opsional)**
   - Jika Anda memiliki backup data, upload file JSON ke server
   - Import data menggunakan script:
     ```bash
     cd public_html
     NODE_ENV=production node scripts/import_database.js path/to/full_export.json
     ```

### 5. Verifikasi Deployment

1. **Cek Status Aplikasi**
   - Buka domain di browser
   - Pastikan aplikasi dapat diakses dan berjalan dengan baik

2. **Verifikasi Koneksi Database**
   - SSH ke server atau gunakan Terminal di cPanel (jika tersedia)
   - Jalankan script pengecekan database:
     ```bash
     cd public_html
     NODE_ENV=production node scripts/check_database.js
     ```

3. **Cek Log Error**
   - Di cPanel, buka "Error Log"
   - Periksa jika ada error yang perlu ditangani

## Troubleshooting

### Aplikasi Tidak Berjalan

1. **Periksa File .htaccess**
   - Pastikan file .htaccess memiliki konfigurasi Passenger yang benar
   - Passenger configuration harus mengarah ke direktori dan file yang benar

2. **Periksa Konfigurasi Node.js**
   - Pastikan versi Node.js yang dipilih adalah 18.x
   - Pastikan Application startup file diset ke `start.js`

3. **Periksa File start.js**
   - Pastikan file start.js ada dan memiliki izin yang benar
   - Pastikan script menjalankan aplikasi dengan benar

### Error Database Connection

1. **Periksa Kredensial Database**
   - Verifikasi bahwa kredensial database di .env sudah benar
   - Coba konek ke database menggunakan psql atau PgAdmin

2. **Periksa Struktur Database**
   - Jalankan `node scripts/check_database.js` untuk memeriksa tabel
   - Jika tabel tidak ada, jalankan `node scripts/restore_database.js`

3. **Periksa Firewall atau Pembatasan Akses**
   - Pastikan PostgreSQL dapat diakses dari aplikasi
   - Di Domainesia, biasanya localhost connection tidak memerlukan pengaturan khusus

## Pemeliharaan dan Backup

### Backup Database

1. **Backup Otomatis**
   - Gunakan fitur backup di cPanel untuk mencadangkan database secara berkala

2. **Backup Manual menggunakan Script**
   ```bash
   cd public_html
   npm run export-db
   ```

3. **Download Backup**
   - Dari File Manager, download file `full_export.json`
   - Simpan di tempat yang aman

### Update Aplikasi

1. **Backup Terlebih Dahulu**
   - Backup database menggunakan langkah-langkah di atas
   - Backup file aplikasi penting (uploads/, .env)

2. **Upload Versi Baru**
   - Build versi baru aplikasi
   - ZIP dan upload ke server
   - Extract, ganti file-file lama

3. **Restart Aplikasi**
   - Dari panel "Setup Node.js App", restart aplikasi

## Catatan Penting

- **Izin File**: Pastikan izin file (permissions) sudah benar untuk keamanan
- **Koneksi Database**: DomaiNesia umumnya memerlukan koneksi ke localhost untuk PostgreSQL
- **Node.js Version**: Gunakan Node.js versi 18.x untuk kompatibilitas terbaik
- **Passenger**: Jangan ubah konfigurasi Passenger di .htaccess jika tidak diperlukan
- **Memory Limit**: Jika aplikasi sering crash, periksa memory limit di hosting