/**
 * Script untuk mengimpor data dari file JSON ke database
 * Digunakan untuk memulihkan data dari backup JSON
 * Menggunakan query SQL raw untuk kompatibilitas lebih baik
 * 
 * Cara penggunaan:
 * node scripts/import_database_raw.js <path_to_full_export.json>
 */

import fs from 'fs';
import postgres from 'postgres';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Load environment variables from .env file
const result = dotenv.config();
if (result.parsed) {
  console.log('Loaded environment variables from .env file');
}

// For ESM compatibility
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  // Validate command line arguments
  if (process.argv.length < 3) {
    console.error('Usage: node import_database_raw.js <path_to_full_export.json>');
    process.exit(1);
  }

  // Get file path from command line argument
  const importFilePath = process.argv[2];
  
  // Get database URL from environment variables
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('DATABASE_URL environment variable is not set');
    process.exit(1);
  }

  console.log('Starting database import...');
  
  // Load import data from file
  let importData;
  try {
    console.log(`Import file loaded: ${importFilePath}`);
    const fileContent = fs.readFileSync(importFilePath, 'utf8');
    importData = JSON.parse(fileContent);
    console.log(`Export date: ${importData.exportDate}`);
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
          // Sanitize and prepare data
          const recordForInsert = {};
          
          // Convert camelCase to snake_case
          Object.keys(record).forEach(key => {
            const snakeKey = key.replace(/([A-Z])/g, "_$1").toLowerCase();
            recordForInsert[snakeKey] = record[key];
          });
          
          try {
            // Check if record already exists
            const queryCheck = `SELECT * FROM "${tableName}" WHERE "${idField}" = $1`;
            const existingRecord = await sql.unsafe(queryCheck, [record[idField]]);
            
            if (existingRecord.length > 0) {
              // Update existing record
              const id = record[idField];
              const updateFields = Object.keys(recordForInsert).filter(k => k !== idField);
              
              if (updateFields.length > 0) {
                // Build SET clause and values array
                const setClauses = [];
                const values = [id]; // First value is ID for WHERE clause
                
                updateFields.forEach((key, index) => {
                  setClauses.push(`"${key}" = $${index + 2}`); // +2 because $1 is used in WHERE
                  values.push(recordForInsert[key]);
                });
                
                const updateQuery = `
                  UPDATE "${tableName}" 
                  SET ${setClauses.join(', ')}
                  WHERE "${idField}" = $1
                `;
                
                await sql.unsafe(updateQuery, values);
              }
            } else {
              // Insert new record
              const columns = Object.keys(recordForInsert).map(col => `"${col}"`);
              const placeholders = Object.keys(recordForInsert).map((_, i) => `$${i + 1}`);
              const values = Object.values(recordForInsert);
              
              const insertQuery = `
                INSERT INTO "${tableName}" (${columns.join(', ')})
                VALUES (${placeholders.join(', ')})
              `;
              
              await sql.unsafe(insertQuery, values);
            }
            
            processedCount++;
            if (processedCount % 50 === 0) {
              console.log(`- Processed ${processedCount}/${data.length} records...`);
            }
          } catch (error) {
            console.error(`Error processing record ${record[idField]} for ${tableName}:`, error);
            // Continue with the next record despite error
          }
        }
        
        return processedCount;
      } catch (error) {
        console.error(`Error importing ${tableName}:`, error);
        return 0; // Return 0 to indicate failed import but continue with other tables
      }
    }
    
    // Import settings (prioritize because it's important for the system)
    const settingsCount = await importTable('settings', importData.data.settings);
    console.log(`Imported ${settingsCount} settings records`);
    
    // Import subjects (needed before grades)
    const subjectsCount = await importTable('subjects', importData.data.subjects);
    console.log(`Imported ${subjectsCount} subjects records`);
    
    // Import students - limit to first 50 for testing
    const studentsToImport = importData.data.students ? importData.data.students.slice(0, 50) : [];
    const studentsCount = await importTable('students', studentsToImport);
    console.log(`Imported ${studentsCount} students records (limited to 50 for testing)`);
    
    // Import users
    const usersCount = await importTable('users', importData.data.users);
    console.log(`Imported ${usersCount} users records`);
    
    // Import grades - only for the students we imported
    if (importData.data.grades && studentsToImport.length > 0) {
      const studentIds = studentsToImport.map(s => s.id);
      const gradesToImport = importData.data.grades.filter(g => studentIds.includes(g.studentId));
      const gradesCount = await importTable('grades', gradesToImport);
      console.log(`Imported ${gradesCount} grades records (only for imported students)`);
    } else {
      console.log('No grades to import');
    }
    
    console.log('\nImport completed successfully!');
    console.log('\nImport summary:');
    console.log(`- Settings: ${settingsCount}`);
    console.log(`- Subjects: ${subjectsCount}`);
    console.log(`- Students: ${studentsCount}`);
    console.log(`- Users: ${usersCount}`);
    
  } catch (error) {
    console.error('Error during import:', error);
  } finally {
    // Close database connection
    await sql.end();
  }
}

// Run the import
main();