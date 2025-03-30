/**
 * Script untuk memeriksa koneksi ke database
 * 
 * Cara penggunaan:
 * npx tsx scripts/check_database.js
 */

import postgres from 'postgres';
import dotenv from 'dotenv';
import { drizzle } from 'drizzle-orm/postgres-js';

// Load environment variables
dotenv.config();

// Get database URL from environment variables
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('ERROR: DATABASE_URL tidak ditemukan di environment variables');
  console.error('Pastikan file .env sudah dibuat dengan benar');
  process.exit(1);
}

async function main() {
  console.log('Memeriksa koneksi database...');
  console.log(`Host: ${process.env.PGHOST}`);
  console.log(`Port: ${process.env.PGPORT}`);
  console.log(`Database: ${process.env.PGDATABASE}`);
  console.log(`User: ${process.env.PGUSER}`);
  
  // Initialize database connection
  const queryClient = postgres(databaseUrl, { max: 1 });
  
  try {
    // Try to run a simple query
    console.log('Menjalankan query sederhana untuk mengecek koneksi...');
    const result = await queryClient.unsafe('SELECT current_timestamp as time');
    
    console.log('✅ Koneksi database berhasil!');
    console.log(`Waktu server database: ${result[0].time}`);
    
    // Try to check if our tables exist
    console.log('\nMemeriksa tabel-tabel yang ada...');
    const tables = await queryClient.unsafe(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    
    if (tables.length === 0) {
      console.log('❌ Tidak ada tabel yang ditemukan di database.');
      console.log('Anda perlu menjalankan script restore_database.js untuk membuat skema database.');
    } else {
      console.log('Tabel yang ditemukan:');
      tables.forEach((table, index) => {
        console.log(` ${index + 1}. ${table.table_name}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Koneksi database gagal!');
    console.error('Detail error:', error.message);
    process.exit(1);
  } finally {
    // Close database connection
    await queryClient.end();
  }
}

// Run the check
main().catch(error => {
  console.error('Error tidak tertangani:', error);
  process.exit(1);
});