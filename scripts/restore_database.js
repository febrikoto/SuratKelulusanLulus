/**
 * Script untuk melakukan inisialisasi database dan restore schema pada hosting baru
 * 
 * Cara penggunaan:
 * 1. Sesuaikan variabel lingkungan database di hosting
 * 2. Jalankan: node scripts/restore_database.js
 */

import postgres from 'postgres';
import fs from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';
import { scrypt, randomBytes } from 'crypto';
import { promisify } from 'util';
import dotenv from 'dotenv';

// Directory name setup untuk ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env jika ada
try {
  if (fs.existsSync('.env')) {
    dotenv.config();
    console.log('Loaded environment variables from .env file');
  }
} catch (error) {
  console.warn('Error loading .env file:', error.message);
}

// Pastikan DATABASE_URL ada
if (!process.env.DATABASE_URL) {
  console.error('Error: DATABASE_URL environment variable is not set');
  console.error('Please set it in .env file or environment variables');
  process.exit(1);
}

// Helper untuk password hashing
const scryptAsync = promisify(scrypt);

async function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64));
  return `${buf.toString("hex")}.${salt}`;
}

async function main() {
  console.log('Starting database restoration...');
  
  // Setup koneksi database
  console.log('Connecting to database...');
  const migrationClient = postgres(process.env.DATABASE_URL, { max: 1 });
  
  try {
    // Buat tabel secara manual
    console.log('Creating database schema manually...');
    
    try {
      // Buat tabel users
      await migrationClient`
        CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          username TEXT NOT NULL UNIQUE,
          password TEXT NOT NULL,
          full_name TEXT NOT NULL,
          role TEXT NOT NULL,
          student_id INTEGER,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          has_seen_welcome BOOLEAN DEFAULT FALSE,
          assigned_major TEXT DEFAULT ''
        )
      `;
      
      // Buat tabel lainnya (students, settings, dll)
      await migrationClient`
        CREATE TABLE IF NOT EXISTS students (
          id SERIAL PRIMARY KEY,
          nisn TEXT NOT NULL UNIQUE,
          nis TEXT,
          full_name TEXT NOT NULL,
          birth_place TEXT,
          birth_date DATE,
          parent_name TEXT,
          class_name TEXT,
          status TEXT DEFAULT 'pending',
          verified_by INTEGER,
          verification_date TIMESTAMP WITH TIME ZONE,
          verification_notes TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          major TEXT DEFAULT ''
        )
      `;
      
      await migrationClient`
        CREATE TABLE IF NOT EXISTS settings (
          id SERIAL PRIMARY KEY,
          school_name TEXT NOT NULL,
          school_address TEXT,
          school_website TEXT,
          school_email TEXT,
          principal_name TEXT,
          principal_nip TEXT,
          letter_number TEXT,
          graduation_date DATE,
          graduation_time TEXT,
          ministry_logo_path TEXT,
          school_logo_path TEXT,
          principal_signature_path TEXT,
          school_stamp_path TEXT,
          certificate_text TEXT,
          ministry_header TEXT,
          school_header TEXT,
          province_header TEXT,
          city_header TEXT,
          use_letterhead_image BOOLEAN DEFAULT FALSE,
          letterhead_image_path TEXT
        )
      `;
      
      await migrationClient`
        CREATE TABLE IF NOT EXISTS grades (
          id SERIAL PRIMARY KEY,
          student_id INTEGER NOT NULL,
          subject_id INTEGER NOT NULL,
          score INTEGER NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
      `;
      
      await migrationClient`
        CREATE TABLE IF NOT EXISTS subjects (
          id SERIAL PRIMARY KEY,
          name TEXT NOT NULL,
          code TEXT NOT NULL UNIQUE,
          group_name TEXT,
          major TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
      `;
      
      console.log('Successfully created database schema manually');
      
      // Buat admin baru
      const adminPassword = await hashPassword('admin123');
      
      await migrationClient`
        INSERT INTO users (username, password, full_name, role, has_seen_welcome, created_at)
        VALUES ('admin', ${adminPassword}, 'Admin Sekolah', 'admin', true, CURRENT_TIMESTAMP)
        ON CONFLICT (username) DO NOTHING
      `;
      
      console.log('Created default admin user:');
      console.log('Username: admin');
      console.log('Password: admin123');
      console.log('IMPORTANT: Change this password immediately after first login!');
    } catch (manualError) {
      console.error('Error creating schema manually:');
      console.error(manualError);
      process.exit(1);
    }
    
    console.log('Database restoration completed successfully!');
    console.log('\nNext steps:');
    console.log('1. Login with the admin account');
    console.log('2. Set up your school settings');
    console.log('3. Create subjects and import students');
    
  } catch (error) {
    console.error('Error during database restoration:');
    console.error(error);
    process.exit(1);
  } finally {
    await migrationClient.end();
  }
}

main();