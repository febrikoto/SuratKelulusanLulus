#!/bin/bash
# Script untuk memulihkan aplikasi SKL dari backup

# Periksa argumen
if [ "$#" -ne 1 ]; then
  echo "Penggunaan: $0 <path_to_backup_json>"
  echo "Contoh: $0 ./backup/data/full_export_2025-03-30.json"
  exit 1
fi

BACKUP_FILE=$1

# Periksa file backup
if [ ! -f "$BACKUP_FILE" ]; then
  echo "File backup tidak ditemukan: $BACKUP_FILE"
  exit 1
fi

# Periksa .env
if [ ! -f .env ]; then
  echo "File .env tidak ditemukan!"
  echo "Silakan salin backup/database_variables.env ke .env dan sesuaikan konfigurasinya"
  exit 1
fi

# Restore data
echo "Memulihkan data dari $BACKUP_FILE..."
node scripts/import_database.js "$BACKUP_FILE"

# Pulihkan folder uploads jika ada
read -p "Apakah Anda ingin memulihkan folder uploads dari backup? (y/n) " choice
if [[ "$choice" == "y" || "$choice" == "Y" ]]; then
  echo "Menampilkan daftar backup uploads yang tersedia:"
  ls -la backup/data/uploads-*.tar.gz 2>/dev/null
  
  read -p "Masukkan path file backup uploads: " uploads_backup
  
  if [ -f "$uploads_backup" ]; then
    echo "Memulihkan folder uploads..."
    tar -xzf "$uploads_backup" -C ./
    echo "Folder uploads berhasil dipulihkan!"
  else
    echo "File backup uploads tidak ditemukan: $uploads_backup"
  fi
fi

echo "Proses pemulihan selesai!"
exit 0