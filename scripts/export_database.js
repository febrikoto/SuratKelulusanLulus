/**
 * Script untuk mengekspor data dari database ke format JSON
 * Berguna untuk melakukan backup data secara terstruktur tanpa perlu akses langsung ke postgres
 * 
 * Cara penggunaan:
 * node scripts/export_database.js
 */

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Get the directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Jalankan dengan NODE_ENV=development untuk logging lebih detail
const isDev = process.env.NODE_ENV === 'development';

// Load .env file jika ada
try {
  if (fs.existsSync('.env')) {
    dotenv.config();
    console.log('Loaded environment variables from .env file');
  }
} catch (error) {
  console.warn('Error loading .env file:', error.message);
}

// Check database URL
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('Error: DATABASE_URL environment variable is not set');
  console.error('Make sure you have configured the database connection in .env file');
  process.exit(1);
}

// Load schema
let users, students, settings, grades, subjects;
try {
  const schema = await import('../shared/schema.js');
  users = schema.users;
  students = schema.students;
  settings = schema.settings;
  grades = schema.grades;
  subjects = schema.subjects;
  console.log('Successfully loaded schema from shared/schema.js');
} catch (error) {
  console.error('Error loading schema:', error.message);
  console.error('Make sure you have the shared/schema.js file and run this from the project root.');
  process.exit(1);
}

async function main() {
  console.log('Starting database export...');
  
  // Set output file path
  let outputPath;
  if (process.argv.length >= 3) {
    // Use the specified output file path
    outputPath = process.argv[2];
    console.log(`Using specified output path: ${outputPath}`);
    
    // Ensure directory exists
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
      console.log(`Created output directory: ${outputDir}`);
    }
  } else {
    // Use default output directory
    const exportDir = path.join(__dirname, '..', 'backup', 'data');
    if (!fs.existsSync(exportDir)) {
      fs.mkdirSync(exportDir, { recursive: true });
    }
    
    const timestamp = new Date().toISOString().replace(/[:T.]/g, '-').slice(0, 19);
    outputPath = path.join(exportDir, `full_export_${timestamp}.json`);
    console.log(`Using default output path: ${outputPath}`);
  }
  
  console.log('Connecting to database...');
  
  // Initialize database connection
  const queryClient = postgres(databaseUrl, { max: 1 });
  const db = drizzle(queryClient);

  try {
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
    fs.writeFileSync(outputPath, JSON.stringify(fullExport, null, 2));

    console.log('Export completed successfully!');
    console.log(`Data exported to: ${outputPath}`);
    
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
main().catch(error => {
  console.error('Unhandled error during export:', error);
  process.exit(1);
});