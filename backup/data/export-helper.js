/**
 * Script untuk membantu mengekspor data dari database PostgreSQL di Replit
 * Disertakan dalam backup untuk membantu proses ekspor/impor database
 * 
 * Salin file ini ke direktori root dan jalankan dengan:
 * node export-helper.js
 */

const { drizzle } = require('drizzle-orm/postgres-js');
const postgres = require('postgres');
const fs = require('fs');
const path = require('path');

// Jalankan dengan NODE_ENV=development untuk logging lebih detail
const isDev = process.env.NODE_ENV === 'development';

// Load .env file jika ada
try {
  if (fs.existsSync('.env')) {
    require('dotenv').config();
    console.log('Loaded environment variables from .env file');
  }
} catch (error) {
  console.warn('Error loading .env file:', error.message);
}

// Load schema dari shared/schema
let users, students, settings, grades, subjects;
try {
  const schema = require('../shared/schema');
  users = schema.users;
  students = schema.students;
  settings = schema.settings;
  grades = schema.grades;
  subjects = schema.subjects;
  console.log('Successfully loaded schema from shared/schema.ts');
} catch (error) {
  console.error('Error loading schema:', error.message);
  console.error('Make sure you have the shared/schema.ts file and run this from the project root.');
  process.exit(1);
}

async function exportData() {
  console.log('Starting database export...');

  // Check database URL
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('Error: DATABASE_URL environment variable is not set');
    console.error('Make sure you have configured the database connection in .env file');
    process.exit(1);
  }

  console.log('Connecting to database...');
  
  // Initialize database connection
  const queryClient = postgres(databaseUrl, { max: 1 });
  const db = drizzle(queryClient);

  try {
    // Create export directory
    const exportDir = path.join(__dirname, 'export');
    if (!fs.existsSync(exportDir)) {
      fs.mkdirSync(exportDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:T.]/g, '-').slice(0, 19);
    
    // Export data
    console.log('Exporting users...');
    const usersData = await db.select().from(users);
    
    console.log('Exporting students...');
    const studentsData = await db.select().from(students);
    
    console.log('Exporting settings...');
    const settingsData = await db.select().from(settings);
    
    console.log('Exporting grades...');
    const gradesData = await db.select().from(grades);
    
    console.log('Exporting subjects...');
    const subjectsData = await db.select().from(subjects);
    
    // Create full export
    const fullExport = {
      metadata: {
        exportDate: new Date().toISOString(),
        databaseVersion: '1.0',
        application: 'SKL System'
      },
      data: {
        users: usersData,
        students: studentsData,
        settings: settingsData,
        grades: gradesData,
        subjects: subjectsData
      }
    };
    
    // Write to file
    const exportPath = path.join(exportDir, `full_export_${timestamp}.json`);
    fs.writeFileSync(exportPath, JSON.stringify(fullExport, null, 2));

    console.log('Export completed successfully!');
    console.log(`Data exported to: ${exportPath}`);
    
    // Summary
    console.log('\nExport summary:');
    console.log(`- Users: ${usersData.length}`);
    console.log(`- Students: ${studentsData.length}`);
    console.log(`- Settings: ${settingsData.length}`);
    console.log(`- Grades: ${gradesData.length}`);
    console.log(`- Subjects: ${subjectsData.length}`);

  } catch (error) {
    console.error('Error during export:', error);
  } finally {
    // Close database connection
    await queryClient.end();
  }
}

// Run the export
exportData();