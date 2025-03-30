# Panduan Import Data ke Supabase

Panduan ini menjelaskan cara mengimpor data dari file JSON hasil ekspor aplikasi SKL ke database Supabase.

## Persiapan

### 1. Setup Proyek Supabase
1. Buat akun di [Supabase](https://supabase.com) jika belum memilikinya
2. Buat proyek baru untuk aplikasi SKL
3. Catat URL, API Key, dan Database Connection String

### 2. File Backup JSON
Pastikan Anda memiliki file JSON hasil ekspor dari aplikasi SKL (misalnya `full_export_2025-03-30-12-29-05.json`)

## Metode 1: Menggunakan Script Import Database Raw

Metode ini menggunakan script `import_database_raw.js` yang sudah dibuat dalam aplikasi SKL.

### Langkah-langkah:

1. Setup koneksi Supabase di file `.env`:
   ```
   DATABASE_URL=postgres://username:password@db.your-supabase-project.supabase.co:6543/postgres
   PGUSER=postgres
   PGPASSWORD=your-password
   PGDATABASE=postgres
   PGHOST=db.your-supabase-project.supabase.co
   PGPORT=6543
   ```

2. Jalankan script restore untuk membuat tabel-tabel yang diperlukan:
   ```bash
   node scripts/restore_database.js
   ```

3. Gunakan script import untuk memasukkan data:
   ```bash
   node scripts/import_database_raw.js path/to/full_export.json
   ```

## Metode 2: Menggunakan Supabase API dengan Node.js

Jika metode pertama gagal atau membutuhkan pendekatan yang berbeda, Anda bisa menggunakan Supabase API.

### Langkah-langkah:

1. Buat file JavaScript baru bernama `supabase-import.js`:

```javascript
// supabase-import.js
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Supabase credentials
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Create Supabase client
const supabase = createClient(supabaseUrl, supabaseKey);

async function importData() {
  try {
    // Read the export file
    const filePath = process.argv[2];
    if (!filePath) {
      console.error('Please provide a file path: node supabase-import.js path/to/file.json');
      process.exit(1);
    }
    
    console.log(`Reading file from ${filePath}...`);
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const importData = JSON.parse(fileContent);
    console.log('File loaded successfully');
    
    // Import settings
    if (importData.data.settings && importData.data.settings.length > 0) {
      console.log('Importing settings...');
      const { error: settingsError } = await supabase
        .from('settings')
        .upsert(importData.data.settings, { onConflict: 'id' });
      
      if (settingsError) {
        console.error('Error importing settings:', settingsError);
      } else {
        console.log('Settings imported successfully');
      }
    }
    
    // Import subjects
    if (importData.data.subjects && importData.data.subjects.length > 0) {
      console.log('Importing subjects...');
      const { error: subjectsError } = await supabase
        .from('subjects')
        .upsert(importData.data.subjects, { onConflict: 'id' });
      
      if (subjectsError) {
        console.error('Error importing subjects:', subjectsError);
      } else {
        console.log('Subjects imported successfully');
      }
    }
    
    // Import students
    if (importData.data.students && importData.data.students.length > 0) {
      console.log('Importing students...');
      const { error: studentsError } = await supabase
        .from('students')
        .upsert(importData.data.students, { onConflict: 'id' });
      
      if (studentsError) {
        console.error('Error importing students:', studentsError);
      } else {
        console.log('Students imported successfully');
      }
    }
    
    // Import users
    if (importData.data.users && importData.data.users.length > 0) {
      console.log('Importing users...');
      const { error: usersError } = await supabase
        .from('users')
        .upsert(importData.data.users, { onConflict: 'id' });
      
      if (usersError) {
        console.error('Error importing users:', usersError);
      } else {
        console.log('Users imported successfully');
      }
    }
    
    // Import grades
    if (importData.data.grades && importData.data.grades.length > 0) {
      console.log('Importing grades...');
      const { error: gradesError } = await supabase
        .from('grades')
        .upsert(importData.data.grades, { onConflict: 'id' });
      
      if (gradesError) {
        console.error('Error importing grades:', gradesError);
      } else {
        console.log('Grades imported successfully');
      }
    }
    
    console.log('Import completed!');
    
  } catch (error) {
    console.error('Error during import:', error);
  }
}

// Run the import
importData();
```

2. Buat file `.env` dengan kredensial Supabase:
```
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

3. Install Supabase JS Client:
```bash
npm install @supabase/supabase-js
```

4. Jalankan script import:
```bash
node supabase-import.js path/to/full_export.json
```

## Metode 3: Menggunakan SQL Queries di Supabase SQL Editor

Jika data tidak terlalu banyak, Anda bisa mengimpor langsung melalui SQL Editor di Supabase.

### Langkah-langkah:

1. Modifikasi script ekspor untuk menghasilkan SQL queries:
   - Buat file `generate-sql.js`:

```javascript
// generate-sql.js
import fs from 'fs';

// Get the export file path from command line arguments
const exportFilePath = process.argv[2];
if (!exportFilePath) {
  console.error('Please provide an export file path');
  process.exit(1);
}

// Read the export file
try {
  const fileContent = fs.readFileSync(exportFilePath, 'utf8');
  const exportData = JSON.parse(fileContent);
  
  // Open SQL file for writing
  const sqlFilePath = exportFilePath.replace('.json', '.sql');
  const sqlStream = fs.createWriteStream(sqlFilePath);
  
  // Generate SQL statements for settings
  if (exportData.data.settings && exportData.data.settings.length > 0) {
    exportData.data.settings.forEach(setting => {
      const columns = Object.keys(setting).map(key => `"${key}"`).join(', ');
      const values = Object.values(setting).map(val => 
        val === null ? 'NULL' : 
        typeof val === 'string' ? `'${val.replace(/'/g, "''")}'` : 
        typeof val === 'boolean' ? (val ? 'true' : 'false') : 
        val
      ).join(', ');
      
      sqlStream.write(`INSERT INTO settings (${columns}) VALUES (${values}) ON CONFLICT (id) DO UPDATE SET ${
        Object.keys(setting).map(key => `"${key}" = EXCLUDED."${key}"`).join(', ')
      };\n`);
    });
  }
  
  // Generate SQL statements for other tables
  // Example for subjects
  if (exportData.data.subjects && exportData.data.subjects.length > 0) {
    exportData.data.subjects.forEach(subject => {
      const columns = Object.keys(subject).map(key => `"${key}"`).join(', ');
      const values = Object.values(subject).map(val => 
        val === null ? 'NULL' : 
        typeof val === 'string' ? `'${val.replace(/'/g, "''")}'` : 
        typeof val === 'boolean' ? (val ? 'true' : 'false') : 
        val
      ).join(', ');
      
      sqlStream.write(`INSERT INTO subjects (${columns}) VALUES (${values}) ON CONFLICT (id) DO UPDATE SET ${
        Object.keys(subject).map(key => `"${key}" = EXCLUDED."${key}"`).join(', ')
      };\n`);
    });
  }
  
  // Generate SQL for other tables: students, users, grades
  // Repeat the pattern above for each table
  
  sqlStream.end();
  console.log(`SQL file generated at: ${sqlFilePath}`);
  
} catch (error) {
  console.error('Error generating SQL:', error);
}
```

2. Jalankan script untuk menghasilkan file SQL:
```bash
node generate-sql.js path/to/full_export.json
```

3. Buka Supabase Dashboard dan masuk ke SQL Editor
4. Copy-paste isi file SQL yang dihasilkan ke SQL Editor
5. Jalankan query untuk mengimpor data

## Verifikasi Import

Setelah mengimpor data, verifikasi bahwa semua data telah berhasil diimpor:

1. Buka Supabase Dashboard
2. Buka Table Editor
3. Periksa jumlah baris di setiap tabel: settings, subjects, students, users, grades
4. Bandingkan dengan data yang ada di file ekspor

## Troubleshooting

### Error "Relation Does Not Exist"
- Pastikan tabel sudah dibuat dengan benar menggunakan `restore_database.js`
- Periksa nama tabel di Supabase (case sensitive)

### Error "Duplicate Key Value Violates Unique Constraint"
- Gunakan opsi ON CONFLICT DO UPDATE untuk mengatasi konflik ID
- Alternatif: Bersihkan data sebelum mengimpor dengan DELETE queries

### Error "Column X Does Not Exist"
- Periksa skema tabel di Supabase vs. skema di aplikasi
- Mungkin perlu menyesuaikan nama kolom (casing atau format)

## Tips

- Gunakan service role key Supabase untuk akses penuh (Jangan bagikan key ini)
- Impor tabel dalam urutan dependensi: settings → subjects → students → users → grades
- Untuk dataset besar, impor dalam batch untuk menghindari timeout
- Simpan semua log import untuk referensi jika ada masalah

## Penutup

Setelah data berhasil diimpor, perbarui CONNECTION_STRING di konfigurasi hosting aplikasi untuk mengarah ke database Supabase.