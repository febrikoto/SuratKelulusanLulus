# Panduan Versioning Aplikasi SKL

## Skema Versioning

Aplikasi SKL mengikuti aturan [Semantic Versioning](https://semver.org/) dengan format: **MAJOR.MINOR.PATCH**

- **MAJOR**: Perubahan yang tidak kompatibel dengan versi sebelumnya
- **MINOR**: Penambahan fitur yang kompatibel dengan versi sebelumnya
- **PATCH**: Perbaikan bug yang kompatibel dengan versi sebelumnya

## Versi Rilis

### v1.0.0 (30 Maret 2025)
- Rilis awal aplikasi SKL
- Fitur dasar manajemen siswa dan nilai
- Template sertifikat SKL dengan nilai dan tanpa nilai
- Sistem autentikasi multi-role (admin, guru, siswa)
- Import data siswa dan nilai dari Excel
- Pengaturan sekolah dan template sertifikat yang dapat dikonfigurasi

### v1.1.0 (Target: April 2025)
- Penambahan fitur pencarian dan filter yang lebih kompleks
- Peningkatan UI/UX dashboard
- Penambahan fitur export data ke Excel
- Tambahan opsi kustomisasi template sertifikat

### v1.2.0 (Target: Mei 2025)
- Dukungan untuk multiple tahun ajaran
- Penambahan fitur notifikasi
- Implementasi batch printing yang lebih efisien
- Peningkatan keamanan aplikasi

### v2.0.0 (Target: 2026)
- Redesign UI/UX secara menyeluruh
- Arsitektur baru dengan API yang lebih terstruktur
- Dukungan untuk multiple sekolah dalam satu aplikasi
- Fitur analitik dan reporting yang lebih lengkap

## Cabang (Branches) Pengembangan

- **main**: Kode produksi yang stabil
- **develop**: Kode pengembangan untuk fitur-fitur yang sedang dibangun
- **feature/nama-fitur**: Cabang untuk pengembangan fitur spesifik
- **bugfix/nama-bug**: Cabang untuk perbaikan bug
- **release/x.y.z**: Cabang persiapan rilis versi baru

## Konvensi Commit

Format commit message: `<type>(<scope>): <subject>`

### Types:
- **feat**: Fitur baru
- **fix**: Perbaikan bug
- **docs**: Perubahan dokumentasi
- **style**: Perubahan formatting, missing semi colons, dll (tidak mengubah kode)
- **refactor**: Refactoring kode
- **test**: Penambahan atau perbaikan test
- **chore**: Perubahan build process, dependencies, dll

### Contoh:
- `feat(certificate): add QR code verification option`
- `fix(auth): resolve login issue for student accounts`
- `docs(readme): update deployment instructions`
- `refactor(api): optimize student data retrieval`

## Proses Rilis

1. Buat cabang `release/x.y.z` dari `develop`
2. Lakukan testing menyeluruh
3. Update nomor versi di `package.json`
4. Update dokumentasi dan CHANGELOG.md
5. Merge ke `main` dan beri tag versi
6. Merge kembali ke `develop`

## Catatan Penting

- Setiap perubahan database dimasukkan ke dalam file migrasi
- Setiap rilis harus disertai dengan instruksi upgrade
- Backward compatibility diutamakan untuk update MINOR dan PATCH
- Jika terdapat breaking change, versi MAJOR harus dinaikkan

## Konvensi Tag

Format: `v<major>.<minor>.<patch>[-<stage>]`

Contoh:
- `v1.0.0` - Rilis stabil
- `v1.1.0-beta.1` - Rilis beta
- `v1.1.0-rc.1` - Release candidate

## Manajemen Dependensi

- Package.json harus menyertakan versi spesifik dari dependensi
- Update dependensi dilakukan bertahap dan terpisah dari fitur baru
- Testing menyeluruh setelah update dependensi

---

*Dokumen ini akan diperbarui seiring perkembangan aplikasi dan kebutuhan sekolah.*