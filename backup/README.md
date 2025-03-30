# Panduan Instalasi Aplikasi SKL

## Persyaratan Sistem
- Node.js versi 18 atau lebih baru
- PostgreSQL Database
- NPM (Node Package Manager)

## Langkah-langkah Instalasi

### 1. Extract File
Extract file ZIP ini ke direktori utama server Anda.

### 2. Setup Database
1. Buat database PostgreSQL baru di server Anda
2. Gunakan file `database_variables.env` sebagai template untuk mengatur variabel lingkungan:
   - Copy file tersebut ke `.env` di direktori root aplikasi
   - Edit nilai-nilai koneksi database sesuai dengan setup PostgreSQL Anda

### 3. Instalasi Dependensi
Buka terminal di direktori aplikasi dan jalankan:
```
npm install
```

### 4. Restorasi Database
Untuk mengatur struktur database dan user admin awal, jalankan:
```
node scripts/restore_database.js
```

### 5. Build Aplikasi
```
npm run build
```

### 6. Menjalankan Aplikasi
Untuk menjalankan aplikasi dalam mode development:
```
npm run dev
```

Untuk menjalankan dalam mode production:
```
npm start
```

## Informasi Login Default
- Admin: username `admin`, password `admin123`
- PENTING: Segera ganti password default setelah login pertama kali!

## Troubleshooting

### Masalah Database
- Pastikan database PostgreSQL berjalan
- Verifikasi kredensial database di file `.env`
- Cek log error di console terminal

### Masalah Upload File
- Pastikan direktori `uploads` dan subdirektorinya memiliki permission yang benar
- Jika direktori tidak ada, buat dengan perintah:
  ```
  mkdir -p uploads/logos uploads/signatures uploads/stamps uploads/letterheads
  chmod -R 755 uploads
  ```

## Backup Reguler
Sebaiknya jalankan backup reguler database dan file aplikasi, gunakan:
```
bash scripts/backup.sh
```

## Bantuan Tambahan
Lihat dokumentasi lengkap di folder `docs/` untuk informasi lebih lanjut.