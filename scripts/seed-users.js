import pg from 'pg';
import { scrypt, randomBytes } from 'crypto';
import { promisify } from 'util';

const { Client } = pg;

const scryptAsync = promisify(scrypt);

async function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const buf = await scryptAsync(password, salt, 64);
  return `${buf.toString('hex')}.${salt}`;
}

async function seedDatabase() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    console.log('Connected to database');

    // Check if teacher exists
    const teacherExistsQuery = 'SELECT * FROM users WHERE username = $1';
    const teacherResult = await client.query(teacherExistsQuery, ['guru1']);

    if (teacherResult.rows.length === 0) {
      console.log('Creating teacher account...');
      const teacherPassword = await hashPassword('guru123');
      const insertTeacherQuery = `
        INSERT INTO users (username, password, full_name, role, student_id) 
        VALUES ($1, $2, $3, $4, $5)
      `;
      await client.query(insertTeacherQuery, ['guru1', teacherPassword, 'Guru Kelas XII-A', 'guru', null]);
      console.log('Teacher account created');
    } else {
      console.log('Teacher account already exists');
    }

    // Create a student record if it doesn't exist
    const studentRecordExistsQuery = 'SELECT * FROM students WHERE nisn = $1';
    const studentRecordResult = await client.query(studentRecordExistsQuery, ['1234567890']);

    let studentId;
    if (studentRecordResult.rows.length === 0) {
      console.log('Creating student record...');
      const insertStudentQuery = `
        INSERT INTO students (nisn, nis, full_name, birth_place, birth_date, parent_name, class_name, status, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING id
      `;
      const studentRecordResult = await client.query(insertStudentQuery, [
        '1234567890', 
        '123456', 
        'Budi Santoso', 
        'Jakarta', 
        '2006-05-15', 
        'Ahmad Santoso', 
        'XII-A', 
        'pending', 
        new Date()
      ]);
      studentId = studentRecordResult.rows[0].id;
      console.log('Student record created with ID:', studentId);
    } else {
      studentId = studentRecordResult.rows[0].id;
      console.log('Student record already exists with ID:', studentId);
    }

    // Check if student user exists
    const studentExistsQuery = 'SELECT * FROM users WHERE username = $1';
    const studentResult = await client.query(studentExistsQuery, ['siswa1']);

    if (studentResult.rows.length === 0) {
      console.log('Creating student user account...');
      const studentPassword = await hashPassword('siswa123');
      const insertStudentQuery = `
        INSERT INTO users (username, password, full_name, role, student_id) 
        VALUES ($1, $2, $3, $4, $5)
      `;
      await client.query(insertStudentQuery, ['siswa1', studentPassword, 'Budi Santoso', 'siswa', studentId]);
      console.log('Student user account created');
    } else {
      console.log('Student user account already exists');
    }

    console.log('Seed completed successfully');
  } catch (error) {
    console.error('Error seeding database:', error);
  } finally {
    await client.end();
    console.log('Database connection closed');
  }
}

seedDatabase();