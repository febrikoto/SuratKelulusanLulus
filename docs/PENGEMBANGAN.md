# Panduan Pengembangan Aplikasi SKL

## Struktur Proyek

Aplikasi SKL menggunakan struktur fullstack JavaScript dengan React di frontend dan Express.js di backend:

```
├── backup/             # Folder backup database
├── client/             # Frontend React application
│   ├── public/         # Static assets
│   └── src/            # React source code
│       ├── components/ # UI components
│       ├── hooks/      # Custom React hooks
│       ├── lib/        # Utility functions
│       ├── pages/      # Page components
│       └── ...
├── docs/               # Documentation
├── scripts/            # Utility scripts
├── server/             # Backend Express application
│   ├── auth.ts         # Authentication logic
│   ├── certificate-generator.ts # PDF generator
│   ├── db.ts           # Database connection
│   ├── index.ts        # Entry point
│   ├── routes.ts       # API routes
│   ├── storage.ts      # Data access layer
│   └── ...
├── shared/             # Shared code between client/server
│   ├── schema.ts       # Database schema
│   └── types.ts        # TypeScript types
└── uploads/            # Uploaded files
```

## Teknologi yang Digunakan

### Frontend
- React.js dengan TypeScript
- Tailwind CSS untuk styling
- Shadcn/UI untuk komponen UI
- React Query untuk state management
- Wouter untuk routing

### Backend
- Express.js dengan TypeScript
- Drizzle ORM untuk database
- Passport.js untuk autentikasi
- PDFKit untuk generasi sertifikat
- Multer untuk upload file

### Database
- PostgreSQL

## Pengaturan Lingkungan Pengembangan

### Prasyarat
- Node.js v18+
- npm atau yarn
- PostgreSQL

### Instalasi

1. Clone repositori:
   ```bash
   git clone <repo-url>
   cd aplikasi-skl
   ```

2. Install dependensi:
   ```bash
   npm install
   ```

3. Salin file .env.example menjadi .env:
   ```bash
   cp .env.example .env
   ```

4. Atur variabel lingkungan di file .env:
   ```
   NODE_ENV=development
   PORT=3000
   DATABASE_URL=postgres://username:password@localhost:5432/skl_db
   SESSION_SECRET=random_string_for_development
   ```

5. Buat database di PostgreSQL:
   ```sql
   CREATE DATABASE skl_db;
   ```

6. Jalankan migrasi database:
   ```bash
   npm run db:push
   ```

7. Jalankan aplikasi dalam mode pengembangan:
   ```bash
   npm run dev
   ```

8. Buka http://localhost:3000 di browser

## Alur Pengembangan

### Menambahkan Fitur Baru

1. Mulai dengan memperluas skema database di `shared/schema.ts` jika diperlukan
2. Implementasikan metode baru di `server/storage.ts`
3. Tambahkan API endpoint di `server/routes.ts`
4. Implementasikan UI di client/src

### Modifikasi Skema Database

1. Edit definisi tabel di `shared/schema.ts`
2. Jalankan `npm run db:push` untuk memperbaharui skema database

### Pengujian

Aplikasi dapat diuji secara manual menggunakan browser dan API client seperti Postman.

## API Endpoints

Berikut adalah endpoint API utama:

### Autentikasi
- POST `/api/login` - Login
- POST `/api/logout` - Logout
- GET `/api/user` - Mendapatkan info pengguna yang login
- POST `/api/register` - Registrasi pengguna baru (admin only)

### Siswa
- GET `/api/students` - Mendapatkan daftar siswa
- GET `/api/students/:id` - Mendapatkan detail siswa
- POST `/api/students` - Menambah siswa baru
- PATCH `/api/students/:id` - Memperbarui data siswa
- DELETE `/api/students/:id` - Menghapus siswa
- POST `/api/students/import` - Mengimpor siswa dari Excel
- POST `/api/students/:id/verify` - Memverifikasi siswa

### Nilai
- GET `/api/grades/student/:studentId` - Mendapatkan nilai siswa
- POST `/api/grades` - Menambah nilai
- POST `/api/grades/batch` - Menambah nilai secara batch
- DELETE `/api/grades/:id` - Menghapus nilai

### Mata Pelajaran
- GET `/api/subjects` - Mendapatkan daftar mata pelajaran
- POST `/api/subjects` - Menambah mata pelajaran baru
- PATCH `/api/subjects/:id` - Memperbarui mata pelajaran
- DELETE `/api/subjects/:id` - Menghapus mata pelajaran

### Pengaturan
- GET `/api/settings` - Mendapatkan pengaturan aplikasi
- POST `/api/settings` - Menyimpan pengaturan aplikasi

### Sertifikat
- GET `/api/certificate/:studentId` - Mendapatkan sertifikat siswa sebagai PDF
- GET `/api/certificate/:studentId/preview` - Mendapatkan pratinjau sertifikat siswa
- POST `/api/certificate/batch` - Membuat sertifikat batch

## Konfigurasi Sertifikat

Generator sertifikat menggunakan PDFKit dan dapat dikonfigurasi di `server/certificate-generator.ts`. Fitur-fitur utama:

- Dua jenis sertifikat: dengan nilai dan tanpa nilai
- Konfigurasi header dan footer
- Penempatan logo, tanda tangan, dan stempel
- Teks dinamis dengan format HTML sederhana

## Keamanan

- Autentikasi menggunakan express-session dan passport.js
- Password dienkripsi menggunakan scrypt
- Middleware RBAC (Role-Based Access Control) untuk mengontrol akses
- Validasi input menggunakan Zod

## Deployment

Lihat `docs/PANDUAN_HOSTING_NIAGAHOSTER.md` untuk panduan deploy ke Niagahoster.

## Troubleshooting Pengembangan

### Database Connection Issues
- Periksa credential database di .env
- Pastikan PostgreSQL berjalan
- Periksa firewall dan network settings

### Frontend Build Issues
- Hapus node_modules dan package-lock.json, lalu npm install ulang
- Periksa versi Node.js (minimal v18)
- Jalankan `npm run build` untuk melihat error lebih detail

### Certificate Generation Issues
- Pastikan path ke fonts dan assets lain benar
- Periksa metadata PDF di certificate-generator.ts
- Debug dengan menyimpan PDF sementara di server

## Kontribusi

Silahkan buat issue atau pull request untuk kontribusi.

## Lisensi

Aplikasi ini bersifat tertutup dan hanya untuk penggunaan internal sekolah.

---

Untuk pertanyaan teknis lebih lanjut, silahkan hubungi tim pengembang.