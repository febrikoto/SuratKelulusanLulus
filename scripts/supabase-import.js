/**
 * Script untuk mengimpor data dari file JSON ke Supabase
 * Menggunakan Supabase JavaScript Client
 * 
 * Cara penggunaan:
 * 1. Tambahkan variabel SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY di .env
 * 2. Install package: npm install @supabase/supabase-js
 * 3. Jalankan: node scripts/supabase-import.js path/to/full_export.json
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
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

// Validate Supabase credentials
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env file');
  console.log('Example .env entries:');
  console.log('SUPABASE_URL=https://your-project-id.supabase.co');
  console.log('SUPABASE_SERVICE_ROLE_KEY=your-service-role-key');
  process.exit(1);
}

async function main() {
  // Validate command line arguments
  if (process.argv.length < 3) {
    console.error('Usage: node supabase-import.js <path_to_full_export.json>');
    process.exit(1);
  }

  // Get file path from command line argument
  const importFilePath = process.argv[2];
  
  // Create Supabase client
  console.log('Connecting to Supabase...');
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  // Load import data from file
  let importData;
  try {
    console.log(`Reading file from ${importFilePath}...`);
    const fileContent = fs.readFileSync(importFilePath, 'utf8');
    importData = JSON.parse(fileContent);
    console.log(`Export date: ${importData.exportDate || 'unknown'}`);
  } catch (error) {
    console.error('Error reading import file:', error.message);
    process.exit(1);
  }
  
  try {
    // Import data table by table in the correct order to respect foreign keys
    console.log('\n==== Starting Import Process ====\n');
    
    // Function to process table import
    async function importTable(tableName, data, batchSize = 50) {
      if (!data || !Array.isArray(data) || data.length === 0) {
        console.log(`No data to import for ${tableName}`);
        return 0;
      }
      
      console.log(`Importing ${data.length} records to ${tableName}...`);
      
      // Process in batches to avoid timeouts
      const batches = [];
      for (let i = 0; i < data.length; i += batchSize) {
        batches.push(data.slice(i, i + batchSize));
      }
      
      let importedCount = 0;
      
      for (let [index, batch] of batches.entries()) {
        try {
          // Convert camelCase to snake_case for all records
          const snakeCaseBatch = batch.map(record => {
            const snakeCaseRecord = {};
            Object.keys(record).forEach(key => {
              // Handle special case where key might already be snake_case
              if (key.includes('_')) {
                snakeCaseRecord[key] = record[key];
              } else {
                const snakeKey = key.replace(/([A-Z])/g, "_$1").toLowerCase();
                snakeCaseRecord[snakeKey] = record[key];
              }
            });
            return snakeCaseRecord;
          });
          
          // Inspect the first record for debugging
          if (index === 0) {
            console.log(`Sample record for ${tableName}:`, JSON.stringify(snakeCaseBatch[0]).substring(0, 100) + '...');
          }
          
          // Log the request to debug
          console.log(`Attempting to insert into table: ${tableName}`);
          
          try {
            // Insert or update records
            const { data: result, error } = await supabase
              .from(tableName)
              .upsert(snakeCaseBatch, { 
                onConflict: 'id',
                ignoreDuplicates: false
              });
            
            if (error) {
              console.error(`Error importing batch ${index+1}/${batches.length} for ${tableName}:`, JSON.stringify(error));
              // If it's a permission error, let's try just logging in
              if (error.code === 'PGRST301' || error.message?.includes('permission')) {
                console.log('Trying to check auth status...');
                const { data: authData, error: authError } = await supabase.auth.getUser();
                if (authError) {
                  console.error('Auth error:', JSON.stringify(authError));
                } else {
                  console.log('Auth status:', authData ? 'Authenticated' : 'Not authenticated');
                }
              }
            } else {
              importedCount += batch.length;
              console.log(`- Imported batch ${index+1}/${batches.length} (${importedCount}/${data.length} records)`);
            }
          } catch (innerError) {
            console.error(`Unexpected error when importing to ${tableName}:`, innerError);
          }
        } catch (batchError) {
          console.error(`Error processing batch ${index+1}/${batches.length} for ${tableName}:`, batchError);
        }
      }
      
      console.log(`Completed importing ${importedCount}/${data.length} records to ${tableName}`);
      return importedCount;
    }
    
    // Import settings
    const settingsCount = await importTable('settings', importData.data.settings, 10);
    
    // Import subjects
    const subjectsCount = await importTable('subjects', importData.data.subjects, 20);
    
    // Import students
    const studentsCount = await importTable('students', importData.data.students, 50);
    
    // Import users (depends on students for student_id foreign key)
    const usersCount = await importTable('users', importData.data.users, 50);
    
    // Import grades (depends on students and subjects)
    const gradesCount = await importTable('grades', importData.data.grades, 100);
    
    console.log('\n==== Import Summary ====');
    console.log(`Settings: ${settingsCount} records`);
    console.log(`Subjects: ${subjectsCount} records`);
    console.log(`Students: ${studentsCount} records`);
    console.log(`Users: ${usersCount} records`);
    console.log(`Grades: ${gradesCount} records`);
    console.log('\nImport completed!');
    
  } catch (error) {
    console.error('Error during import process:', error);
  }
}

// Run the main function
main();