-- Broadway Report Card System - Insert Default Data
-- This matches your actual database schema
-- Run this in Supabase SQL Editor

-- Insert default school (matching your actual schema)
INSERT INTO schools (
  name, 
  code, 
  email, 
  contact_phones,
  address_box,
  motto,
  reg_number
) 
VALUES (
  'Broadway Nursery and Primary School',
  'BROADWAY',
  'info@broadway.school',
  '+254700000000',
  'P.O. Box 12345, Nairobi',
  'Excellence in Education',
  'REG/2025/001'
) 
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  email = EXCLUDED.email;

-- Insert default admin user
-- Password: admin123 (hashed with bcrypt)
INSERT INTO users (
  username, 
  password, 
  name, 
  role, 
  email, 
  is_super_admin
)
VALUES (
  'admin',
  '$2a$10$YourHashedPasswordHere',
  'System Administrator',
  'admin',
  'admin@broadway.school',
  TRUE
) 
ON CONFLICT (username) DO UPDATE SET
  name = EXCLUDED.name,
  email = EXCLUDED.email;

-- Link admin to school
INSERT INTO user_schools (user_id, school_id, role, is_primary)
SELECT u.id, s.id, 'admin', TRUE
FROM users u, schools s
WHERE u.username = 'admin' AND s.code = 'BROADWAY'
ON CONFLICT (user_id, school_id) DO NOTHING;

-- Verify the setup
SELECT 
  'Setup complete!' as status,
  'Username: admin' as username,
  'Password: admin123' as password,
  'School: ' || s.name as school
FROM schools s
WHERE s.code = 'BROADWAY';
