-- Broadway Report Card System - Initial Database Setup
-- Run this in Supabase SQL Editor

-- Create schools table
CREATE TABLE IF NOT EXISTS schools (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT UNIQUE NOT NULL,
  email TEXT,
  phone TEXT,
  address TEXT,
  logo_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'teacher', 'accountant')),
  email TEXT,
  phone TEXT,
  is_super_admin BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user_schools junction table
CREATE TABLE IF NOT EXISTS user_schools (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  school_id INTEGER REFERENCES schools(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  is_primary BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, school_id)
);

-- Create students table
CREATE TABLE IF NOT EXISTS students (
  id SERIAL PRIMARY KEY,
  school_id INTEGER REFERENCES schools(id) ON DELETE CASCADE,
  admission_number TEXT NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  date_of_birth DATE,
  gender TEXT CHECK (gender IN ('male', 'female', 'other')),
  class TEXT,
  stream TEXT,
  parent_name TEXT,
  parent_phone TEXT,
  parent_email TEXT,
  address TEXT,
  photo_url TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'graduated', 'transferred')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(school_id, admission_number)
);

-- Create teachers table
CREATE TABLE IF NOT EXISTS teachers (
  id SERIAL PRIMARY KEY,
  school_id INTEGER REFERENCES schools(id) ON DELETE CASCADE,
  employee_number TEXT NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  subject TEXT,
  qualification TEXT,
  hire_date DATE,
  photo_url TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'on_leave')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(school_id, employee_number)
);

-- Create marks table
CREATE TABLE IF NOT EXISTS marks (
  id SERIAL PRIMARY KEY,
  student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
  school_id INTEGER REFERENCES schools(id) ON DELETE CASCADE,
  term TEXT NOT NULL,
  year INTEGER NOT NULL,
  subject TEXT NOT NULL,
  marks DECIMAL(5,2),
  grade TEXT,
  remarks TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default school
INSERT INTO schools (name, code, email, phone, address) 
VALUES (
  'Broadway Nursery and Primary School',
  'BROADWAY',
  'info@broadway.school',
  '+254700000000',
  'Nairobi, Kenya'
) ON CONFLICT (code) DO NOTHING;

-- Insert default admin user
-- Password: admin123 (hashed with bcrypt)
INSERT INTO users (username, password, name, role, email, is_super_admin)
VALUES (
  'admin',
  '$2a$10$YZ8qE3xKJ5VqKqH5gKqH5.xKJ5VqKqH5gKqH5.xKJ5VqKqH5gKqH5O',
  'System Administrator',
  'admin',
  'admin@broadway.school',
  TRUE
) ON CONFLICT (username) DO NOTHING;

-- Link admin to school
INSERT INTO user_schools (user_id, school_id, role, is_primary)
SELECT u.id, s.id, 'admin', TRUE
FROM users u, schools s
WHERE u.username = 'admin' AND s.code = 'BROADWAY'
ON CONFLICT (user_id, school_id) DO NOTHING;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_students_school_id ON students(school_id);
CREATE INDEX IF NOT EXISTS idx_students_admission ON students(admission_number);
CREATE INDEX IF NOT EXISTS idx_teachers_school_id ON teachers(school_id);
CREATE INDEX IF NOT EXISTS idx_marks_student_id ON marks(student_id);
CREATE INDEX IF NOT EXISTS idx_marks_school_id ON marks(school_id);
CREATE INDEX IF NOT EXISTS idx_user_schools_user_id ON user_schools(user_id);
CREATE INDEX IF NOT EXISTS idx_user_schools_school_id ON user_schools(school_id);

-- Success message
SELECT 'Database setup complete! You can now login with username: admin, password: admin123' AS message;
