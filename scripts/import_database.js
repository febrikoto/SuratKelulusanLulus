/**
 * Script untuk mengimpor data dari file JSON ke database
 * Digunakan untuk memulihkan data dari backup JSON
 * 
 * Cara penggunaan:
 * node scripts/import_database.js <path_to_full_export.json>
 */

import postgres from 'postgres';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { eq } from 'drizzle-orm';

// Directory name setup untuk ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

// Karena kita tidak dapat mengakses schema langsung, kita akan mengimpor data secara manual

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
  const sql = postgres(databaseUrl, { max: 1 });

  try {
    // Import data table by table
    console.log('\n==== Starting Import Process ====');
    
    // Utility function for importing a table
    async function importTable(tableName, data, idField = 'id') {
      if (!data || !Array.isArray(data) || data.length === 0) {
        console.log(`No data to import for ${tableName}`);
        return 0;
      }
      
      console.log(`Importing ${data.length} records to ${tableName}...`);
      
      try {
        let processedCount = 0;
        
        // Process each record
        for (const record of data) {
          // Konversi fieldName dari camelCase ke snake_case untuk PostgreSQL
          const recordSql = {};
          Object.keys(record).forEach(key => {
            // Konversi camelCase ke snake_case
            const snakeKey = key.replace(/([A-Z])/g, "_$1").toLowerCase();
            recordSql[snakeKey] = record[key];
          });
          
          // Cek apakah record sudah ada berdasarkan ID
          const existingRecord = await sql.unsafe(`
            SELECT * FROM "${tableName}" 
            WHERE "${idField}" = ${record[idField]}
          `);
          
          if (existingRecord.length > 0) {
            // Update existing record
            const id = record[idField];
            const updateKeys = Object.keys(recordSql).filter(k => k !== idField);
            
            if (updateKeys.length > 0) {
              // Buat query update dinamis dengan quote untuk handle reserved keywords
              const setClause = updateKeys.map(key => {
                // Escape reserved keywords dan nilai string
                const quotedKey = `"${key}"`;
                const value = recordSql[key] === null ? 'NULL' : 
                  typeof recordSql[key] === 'string' ? 
                    `'${recordSql[key].replace(/'/g, "''")}'` :
                    recordSql[key];
                
                return `${quotedKey} = ${value}`;
              }).join(', ');
              
              await sql.unsafe(`
                UPDATE "${tableName}" 
                SET ${setClause}
                WHERE "${idField}" = ${id}
              `);
            }
          } else {
            // Insert new record
            const columns = Object.keys(recordSql).map(col => `"${col}"`); // Quote column names
            const values = Object.keys(recordSql).map(col => {
              const val = recordSql[col];
              if (val === null) return 'NULL';
              if (typeof val === 'string') return `'${val.replace(/'/g, "''")}'`; // Escape quotes
              return val;
            });
            
            await sql.unsafe(`
              INSERT INTO "${tableName}" (${columns.join(', ')})
              VALUES (${values.join(', ')})
            `);
          }
          
          processedCount++;
          if (processedCount % 50 === 0) {
            console.log(`- Processed ${processedCount}/${data.length} records...`);
          }
        }
        
        return processedCount;
      } catch (error) {
        console.error(`Error importing ${tableName}:`, error);
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
    await sql.end();
  }
}

// Run the import
main();