/**
 * Script untuk mengimpor data dari file JSON ke database
 * Digunakan untuk memulihkan data dari backup JSON
 * 
 * Cara penggunaan:
 * node scripts/import_database.js <path_to_full_export.json>
 */

const { drizzle } = require('drizzle-orm/postgres-js');
const postgres = require('postgres');
const fs = require('fs');
const path = require('path');

// Load .env file jika ada
try {
  if (fs.existsSync('.env')) {
    require('dotenv').config();
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

// Check input arguments
if (process.argv.length < 3) {
  console.error('Usage: node scripts/import_database.js <path_to_export_file.json>');
  process.exit(1);
}

const importFilePath = process.argv[2];
if (!fs.existsSync(importFilePath)) {
  console.error(`Error: File not found: ${importFilePath}`);
  process.exit(1);
}

// Load schema dari shared/schema.ts
let schema;
try {
  schema = require('../shared/schema');
  console.log('Successfully loaded schema from shared/schema.ts');
} catch (error) {
  console.error('Error loading schema:', error.message);
  console.error('Make sure you have the shared/schema.ts file and run this from the project root.');
  process.exit(1);
}

async function main() {
  console.log('Starting database import...');
  
  // Load data from JSON file
  let importData;
  try {
    const fileContent = fs.readFileSync(importFilePath, 'utf8');
    importData = JSON.parse(fileContent);
    
    if (!importData.data) {
      console.error('Invalid import file format: missing "data" property');
      process.exit(1);
    }
    
    console.log(`Import file loaded: ${importFilePath}`);
    console.log(`Export date: ${importData.metadata?.exportDate || 'Unknown'}`);
  } catch (error) {
    console.error('Error reading import file:', error.message);
    process.exit(1);
  }
  
  // Initialize database connection
  console.log('Connecting to database...');
  const queryClient = postgres(databaseUrl, { max: 1 });
  const db = drizzle(queryClient);

  try {
    // Import data table by table
    console.log('\n==== Starting Import Process ====');
    
    // Utility function for importing a table
    async function importTable(table, data, idField = 'id') {
      if (!data || !Array.isArray(data) || data.length === 0) {
        console.log(`No data to import for ${table}`);
        return 0;
      }
      
      console.log(`Importing ${data.length} records to ${table}...`);
      
      // Handle potential conflicts by checking existing IDs
      try {
        // Get a list of existing IDs
        const existingIds = [];
        if (idField) {
          const existingRecords = await db.select({ id: schema[table][idField] }).from(schema[table]);
          existingRecords.forEach(record => existingIds.push(record.id));
        }
        
        // Split into inserts and updates
        const recordsToInsert = [];
        const recordsToUpdate = [];
        
        data.forEach(record => {
          if (idField && existingIds.includes(record[idField])) {
            recordsToUpdate.push(record);
          } else {
            recordsToInsert.push(record);
          }
        });
        
        // Process inserts
        if (recordsToInsert.length > 0) {
          console.log(`- Inserting ${recordsToInsert.length} new records`);
          await db.insert(schema[table]).values(recordsToInsert);
        }
        
        // Process updates
        if (recordsToUpdate.length > 0) {
          console.log(`- Updating ${recordsToUpdate.length} existing records`);
          
          for (const record of recordsToUpdate) {
            const id = record[idField];
            const { [idField]: _, ...updateData } = record;
            
            await db
              .update(schema[table])
              .set(updateData)
              .where(db.eq(schema[table][idField], id));
          }
        }
        
        return data.length;
      } catch (error) {
        console.error(`Error importing ${table}:`, error.message);
        throw error;
      }
    }
    
    // Import settings (prioritize because it's important for the system)
    const settingsCount = await importTable('settings', importData.data.settings);
    console.log(`Imported ${settingsCount} settings records`);
    
    // Import subjects (needed before grades)
    const subjectsCount = await importTable('subjects', importData.data.subjects);
    console.log(`Imported ${subjectsCount} subjects records`);
    
    // Import students (needed before grades and users with student_id)
    const studentsCount = await importTable('students', importData.data.students);
    console.log(`Imported ${studentsCount} students records`);
    
    // Import users
    const usersCount = await importTable('users', importData.data.users);
    console.log(`Imported ${usersCount} users records`);
    
    // Import grades (last, as they depend on students and subjects)
    const gradesCount = await importTable('grades', importData.data.grades);
    console.log(`Imported ${gradesCount} grades records`);
    
    console.log('\nImport completed successfully!');
    console.log('\nImport summary:');
    console.log(`- Settings: ${settingsCount}`);
    console.log(`- Subjects: ${subjectsCount}`);
    console.log(`- Students: ${studentsCount}`);
    console.log(`- Users: ${usersCount}`);
    console.log(`- Grades: ${gradesCount}`);
    
  } catch (error) {
    console.error('Error during import:', error);
  } finally {
    // Close database connection
    await queryClient.end();
  }
}

// Run the import
main();