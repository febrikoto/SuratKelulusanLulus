/**
 * Script untuk membuat skema database di Supabase
 * 
 * Cara penggunaan:
 * node scripts/create-supabase-schema.js
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Error: SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY harus diatur dalam file .env');
  process.exit(1);
}

console.log('Loaded environment variables from .env file');

// SQL untuk membuat tabel-tabel
const createTableSQL = `
-- Tabel settings
CREATE TABLE IF NOT EXISTS settings (
  id SERIAL PRIMARY KEY,
  school_name TEXT NOT NULL,
  school_address TEXT,
  school_email TEXT,
  school_website TEXT,
  school_logo TEXT,
  ministry_logo TEXT,
  headmaster_name TEXT,
  headmaster_nip TEXT,
  headmaster_signature TEXT,
  school_stamp TEXT,
  use_digital_signature BOOLEAN DEFAULT false,
  header_image TEXT,
  use_header_image BOOLEAN DEFAULT false,
  cert_header TEXT,
  cert_footer TEXT,
  cert_before_student_data TEXT,
  cert_after_student_data TEXT,
  cert_number_prefix TEXT,
  cert_regulation_text TEXT,
  cert_criteria_text TEXT,
  academic_year TEXT,
  graduation_date TEXT,
  graduation_time TEXT,
  city_name TEXT,
  province_name TEXT,
  major_list TEXT,
  class_list TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabel subjects
CREATE TABLE IF NOT EXISTS subjects (
  id SERIAL PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  "group" TEXT,
  credits INTEGER DEFAULT 1,
  major TEXT,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabel students
CREATE TABLE IF NOT EXISTS students (
  id SERIAL PRIMARY KEY,
  nisn TEXT UNIQUE NOT NULL,
  nis TEXT,
  full_name TEXT NOT NULL,
  birth_place TEXT,
  birth_date TEXT,
  gender TEXT,
  parent_name TEXT,
  class_name TEXT,
  major TEXT,
  is_verified BOOLEAN DEFAULT false,
  verified_at TIMESTAMP WITH TIME ZONE,
  verified_by INTEGER,
  verification_date TEXT,
  cert_number TEXT,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabel users
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL,
  student_id INTEGER REFERENCES students(id),
  has_seen_welcome BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabel grades
CREATE TABLE IF NOT EXISTS grades (
  id SERIAL PRIMARY KEY,
  student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  subject_id INTEGER NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  value NUMERIC(5,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (student_id, subject_id)
);

-- Index untuk optimasi
CREATE INDEX IF NOT EXISTS idx_students_nisn ON students(nisn);
CREATE INDEX IF NOT EXISTS idx_students_class ON students(class_name);
CREATE INDEX IF NOT EXISTS idx_students_major ON students(major);
CREATE INDEX IF NOT EXISTS idx_students_status ON students(status);
CREATE INDEX IF NOT EXISTS idx_subjects_group ON subjects("group");
CREATE INDEX IF NOT EXISTS idx_subjects_major ON subjects(major);
CREATE INDEX IF NOT EXISTS idx_grades_student ON grades(student_id);
CREATE INDEX IF NOT EXISTS idx_grades_subject ON grades(subject_id);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_student ON users(student_id);
`;

async function main() {
  try {
    console.log('Connecting to Supabase...');
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    console.log('Checking connection...');
    const { data: authData, error: authError } = await supabase.auth.getSession();
    if (authError) {
      console.error('Auth error:', JSON.stringify(authError));
      process.exit(1);
    }

    console.log('Authentication successful.');
    
    // Execute SQL query to create tables
    console.log('Creating database schema...');
    
    // Split the SQL into individual statements
    const statements = createTableSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0);
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i] + ';';
      console.log(`Executing statement ${i+1}/${statements.length}:`);
      console.log(statement.substring(0, 100) + '...');
      
      const { error } = await supabase.rpc('execute_sql', { sql_query: statement });
      
      if (error) {
        console.error(`Error executing statement ${i+1}:`, JSON.stringify(error));
      } else {
        console.log(`Statement ${i+1} executed successfully.`);
      }
    }
    
    console.log('Schema creation complete.');
    
  } catch (error) {
    console.error('Error creating schema:', error);
  }
}

// Run the main function
main();