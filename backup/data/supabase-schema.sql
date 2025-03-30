-- Schema untuk database Supabase
-- Jalankan file ini terlebih dahulu di SQL Editor Supabase

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

-- Tambahkan komentar tabel dan kolom untuk dokumentasi
COMMENT ON TABLE settings IS 'Pengaturan aplikasi dan sekolah';
COMMENT ON TABLE subjects IS 'Data mata pelajaran';
COMMENT ON TABLE students IS 'Data siswa';
COMMENT ON TABLE users IS 'Data pengguna aplikasi';
COMMENT ON TABLE grades IS 'Data nilai siswa';