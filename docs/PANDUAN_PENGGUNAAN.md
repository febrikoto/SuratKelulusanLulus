# Panduan Penggunaan Aplikasi SKL (Surat Keterangan Lulus)

## Pengenalan

Aplikasi SKL adalah sistem pengelolaan surat keterangan lulus siswa berbasis web yang memungkinkan sekolah untuk mengelola data siswa, nilai, dan mencetak sertifikat kelulusan dengan mudah. Aplikasi ini dirancang dengan 3 tingkat pengguna: Admin, Guru, dan Siswa.

## Akses Aplikasi

Akses aplikasi melalui browser web pada alamat URL yang ditentukan oleh admin sekolah.

### Login Sistem

1. Buka aplikasi melalui browser
2. Masukkan username dan password
3. Klik tombol Login

### Jenis Akun

1. **Admin**: Akses penuh ke seluruh sistem
2. **Guru**: Hak akses untuk mengelola data siswa dan nilai
3. **Siswa**: Hak akses terbatas untuk melihat dan mengunduh SKL pribadi

## Fitur Utama Berdasarkan Role

### Admin

#### Dasbor Admin
- Ringkasan statistik: jumlah siswa, guru, mata pelajaran, SKL yang telah diverifikasi
- Grafik progres verifikasi SKL
- Menu navigasi ke semua bagian aplikasi

#### Kelola Pengguna
- Tambah, edit, hapus pengguna (admin, guru, siswa)
- Reset password pengguna
- Atur hak akses pengguna

#### Kelola Data Siswa
- Lihat daftar seluruh siswa
- Tambah/edit/hapus data siswa
- Import data siswa melalui file Excel
- Filter siswa berdasarkan jurusan, kelas, status verifikasi
- Verifikasi data siswa

#### Kelola Nilai
- Input nilai per siswa atau per kelas
- Import nilai dari file Excel
- Edit nilai yang sudah diinput
- Tinjau rekap nilai

#### Kelola Mata Pelajaran
- Tambah/edit/hapus mata pelajaran
- Kelompokkan mata pelajaran berdasarkan kurikulum
- Tetapkan KKM untuk tiap mata pelajaran

#### Pengaturan Sekolah
- Konfigurasi data sekolah (nama, alamat, logo)
- Konfigurasi template sertifikat (header, footer, teks)
- Unggah kop surat, cap, dan tanda tangan
- Toggle untuk tanda tangan digital atau manual
- Atur daftar jurusan dan kelas

#### Sertifikat
- Pratinjau sertifikat siswa
- Cetak semua atau sebagian sertifikat
- Pengaturan format sertifikat (dengan nilai atau tanpa nilai)
- Publikasi sertifikat untuk diakses siswa

### Guru

#### Dasbor Guru
- Ringkasan data siswa yang perlu diinput nilainya
- Navigasi cepat ke input nilai

#### Kelola Nilai
- Input nilai untuk kelas/mata pelajaran yang diampu
- Edit nilai yang sudah diinput
- Upload nilai melalui file Excel

#### Verifikasi Data Siswa
- Verifikasi data siswa untuk kelas yang diampu
- Tandai siswa yang sudah lengkap datanya

### Siswa

#### Dasbor Siswa
- Informasi data diri
- Status verifikasi SKL
- Tautan unduh SKL (jika sudah diverifikasi)

#### Lihat dan Unduh SKL
- Pratinjau SKL
- Unduh SKL dalam format PDF
- Akses riwayat nilai (jika diijinkan oleh admin)

## Alur Penggunaan Aplikasi

### 1. Persiapan Awal (Admin)
1. Login sebagai admin
2. Lengkapi pengaturan sekolah di menu Pengaturan
3. Tentukan format SKL yang akan digunakan
4. Unggah logo, kop surat, dan tanda tangan kepala sekolah
5. Tambahkan daftar mata pelajaran sesuai kurikulum
6. Buat daftar jurusan dan kelas yang ada di sekolah

### 2. Pengelolaan Data Siswa
1. Import data siswa dari file Excel atau tambahkan secara manual
2. Pastikan data siswa lengkap (NISN, Nama, TTL, Jurusan, dll)
3. Tambahkan akun pengguna siswa secara otomatis atau manual

### 3. Pengelolaan Nilai
1. Import nilai dari file Excel atau input manual
2. Pastikan setiap siswa memiliki nilai lengkap untuk semua mata pelajaran
3. Verifikasi kebenaran nilai

### 4. Verifikasi Data
1. Guru/admin melakukan verifikasi data tiap siswa
2. Tandai siswa yang sudah lengkap dan benar datanya
3. Siswa yang terverifikasi dapat mengakses SKL mereka

### 5. Pencetakan dan Publikasi SKL
1. Admin mencetak SKL untuk arsip sekolah
2. SKL dipublikasikan dan dapat diakses oleh siswa
3. Siswa dapat mengunduh SKL mereka masing-masing

## Fitur Spesifik

### Import Data Excel
1. Unduh template Excel dari aplikasi
2. Isi data sesuai format
3. Upload file yang sudah diisi
4. Sistem akan memvalidasi dan mengimpor data

### Pencetakan Sertifikat Batch
1. Pilih siswa yang akan dicetak sertifikatnya
2. Pilih format SKL (dengan nilai/tanpa nilai)
3. Tekan tombol "Cetak Batch"
4. PDF akan dibuat dan dapat diunduh

### Pencarian dan Filter
1. Gunakan kolom pencarian untuk menemukan siswa berdasarkan nama/NISN
2. Filter berdasarkan jurusan, kelas, atau status verifikasi
3. Urutkan data berdasarkan kolom tertentu

## Panduan Troubleshooting

### Login Gagal
- Pastikan username dan password benar
- Periksa caps lock keyboard
- Hubungi admin untuk reset password jika lupa

### Data Tidak Tampil
- Refresh halaman
- Periksa filter yang aktif
- Pastikan data sudah diinput dengan benar

### Sertifikat Tidak Bisa Diunduh
- Pastikan status verifikasi sudah disetujui
- Periksa pengaturan browser (pop-up blocker)
- Pastikan printer virtual PDF terinstal untuk admin

### Error saat Import Data
- Pastikan format file Excel sesuai template
- Periksa validitas data (format tanggal, angka, teks)
- Pastikan tidak ada duplikasi NISN atau ID unik lainnya

## Kontak Support

Jika mengalami kendala teknis dengan aplikasi, silahkan hubungi admin sekolah atau pengembang aplikasi melalui kontak yang tersedia di halaman login.

---

*Catatan: Panduan ini dapat disesuaikan sesuai dengan perkembangan dan perubahan pada aplikasi SKL.*