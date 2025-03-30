/**
 * Script untuk menghasilkan SQL queries dari file JSON ekspor
 * Berguna untuk mengimpor data ke Supabase melalui SQL Editor
 * 
 * Cara penggunaan:
 * node scripts/generate-sql.js path/to/full_export.json
 */

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

async function main() {
  // Validate command line arguments
  if (process.argv.length < 3) {
    console.error('Usage: node generate-sql.js <path_to_full_export.json>');
    process.exit(1);
  }

  // Get file path from command line argument
  const importFilePath = process.argv[2];
  
  console.log(`Generating SQL from ${importFilePath}...`);
  
  // Load import data from file
  let importData;
  try {
    const fileContent = fs.readFileSync(importFilePath, 'utf8');
    importData = JSON.parse(fileContent);
    console.log(`Export date: ${importData.exportDate || 'unknown'}`);
  } catch (error) {
    console.error('Error reading import file:', error.message);
    process.exit(1);
  }
  
  // Open SQL file for writing
  const sqlFilePath = importFilePath.replace('.json', '.sql');
  const sqlStream = fs.createWriteStream(sqlFilePath);
  
  // Function to escape SQL strings
  function sqlEscape(val) {
    if (val === null) return 'NULL';
    if (typeof val === 'string') return `'${val.replace(/'/g, "''")}'`;
    if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE';
    if (val instanceof Date) return `'${val.toISOString()}'`;
    return val;
  }
  
  // Function to generate SQL for a table
  function generateTableSQL(tableName, data) {
    if (!data || !Array.isArray(data) || data.length === 0) {
      console.log(`No data to generate SQL for ${tableName}`);
      return 0;
    }
    
    console.log(`Generating SQL for ${data.length} records in ${tableName}...`);
    let count = 0;
    
    // Add comment header for the table
    sqlStream.write(`\n-- ${tableName} table data\n`);
    
    // Add delete statement to clear existing data
    sqlStream.write(`-- Uncomment to clear existing data first\n`);
    sqlStream.write(`-- DELETE FROM "${tableName}";\n\n`);
    
    // Process each record
    data.forEach(record => {
      const snakeRecord = {};
      
      // Convert keys from camelCase to snake_case
      Object.keys(record).forEach(key => {
        const snakeKey = key.replace(/([A-Z])/g, "_$1").toLowerCase();
        snakeRecord[snakeKey] = record[key];
      });
      
      const columns = Object.keys(snakeRecord).map(key => `"${key}"`).join(', ');
      const values = Object.values(snakeRecord).map(val => sqlEscape(val)).join(', ');
      
      // Generate INSERT with ON CONFLICT DO UPDATE
      const updateClauses = Object.keys(snakeRecord)
        .filter(key => key !== 'id') // Don't update the primary key
        .map(key => `"${key}" = EXCLUDED."${key}"`)
        .join(', ');
      
      sqlStream.write(`INSERT INTO "${tableName}" (${columns})\nVALUES (${values})\nON CONFLICT (id) DO UPDATE SET ${updateClauses};\n\n`);
      
      count++;
      if (count % 50 === 0) {
        console.log(`- Generated SQL for ${count}/${data.length} records in ${tableName}...`);
      }
    });
    
    console.log(`Completed generating SQL for ${count} records in ${tableName}`);
    return count;
  }
  
  // Add header with comments
  sqlStream.write(`-- SQL Import Script for SKL Application\n`);
  sqlStream.write(`-- Generated: ${new Date().toISOString()}\n`);
  sqlStream.write(`-- Source: ${importFilePath}\n\n`);
  
  sqlStream.write(`-- IMPORTANT: Run these statements in the following order\n`);
  sqlStream.write(`-- to respect foreign key constraints.\n\n`);
  
  // Generate SQL for each table in the correct order
  const settingsCount = generateTableSQL('settings', importData.data.settings);
  const subjectsCount = generateTableSQL('subjects', importData.data.subjects);
  const studentsCount = generateTableSQL('students', importData.data.students);
  const usersCount = generateTableSQL('users', importData.data.users);
  const gradesCount = generateTableSQL('grades', importData.data.grades);
  
  // Add footer with summary
  sqlStream.write(`-- Import Summary:\n`);
  sqlStream.write(`-- Settings: ${settingsCount} records\n`);
  sqlStream.write(`-- Subjects: ${subjectsCount} records\n`);
  sqlStream.write(`-- Students: ${studentsCount} records\n`);
  sqlStream.write(`-- Users: ${usersCount} records\n`);
  sqlStream.write(`-- Grades: ${gradesCount} records\n`);
  
  sqlStream.end();
  
  console.log(`\nSQL file generated successfully at: ${sqlFilePath}`);
  console.log(`You can now import this SQL file using Supabase SQL Editor`);
}

// Run the main function
main();