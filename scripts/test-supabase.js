/**
 * Script untuk menguji koneksi ke Supabase
 * 
 * Cara penggunaan:
 * node scripts/test-supabase.js
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Error: SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY harus diatur dalam file .env');
  process.exit(1);
}

console.log('Loaded environment variables:');
console.log('- SUPABASE_URL:', SUPABASE_URL);
console.log('- SUPABASE_SERVICE_ROLE_KEY:', SUPABASE_SERVICE_ROLE_KEY.substring(0, 5) + '...' + SUPABASE_SERVICE_ROLE_KEY.substring(SUPABASE_SERVICE_ROLE_KEY.length - 5));

async function main() {
  try {
    console.log('Connecting to Supabase...');
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    console.log('Checking connection...');
    
    // Test if we can list tables
    console.log('\nTrying to check auth status...');
    const { data: authData, error: authError } = await supabase.auth.getSession();
    if (authError) {
      console.error('Auth error:', JSON.stringify(authError));
    } else {
      console.log('Auth status:', authData ? 'Authenticated' : 'Not authenticated');
      console.log('Auth data:', JSON.stringify(authData).substring(0, 200) + '...');
    }

    // Try to insert a test record
    console.log('\nTrying to fetch settings...');
    const { data: settingsData, error: settingsError } = await supabase
      .from('settings')
      .select('*')
      .limit(1);
    
    if (settingsError) {
      console.error('Error fetching settings:', JSON.stringify(settingsError));
    } else {
      console.log('Settings data:', settingsData ? JSON.stringify(settingsData).substring(0, 200) + '...' : 'No data');
    }

    // Check if tables exist
    console.log('\nTrying to check if tables exist...');
    const tables = ['settings', 'subjects', 'students', 'users', 'grades'];
    
    for (const table of tables) {
      try {
        console.log(`Checking table: ${table}`);
        const { data, error } = await supabase
          .from(table)
          .select('count(*)', { count: 'exact', head: true });
        
        if (error) {
          console.error(`- Error checking table ${table}:`, JSON.stringify(error));
        } else {
          console.log(`- Table ${table} exists, count:`, data ? JSON.stringify(data) : 'undefined');
        }
      } catch (tableError) {
        console.error(`- Unexpected error checking table ${table}:`, tableError);
      }
    }

    console.log('\nConnection test completed.');
  } catch (error) {
    console.error('Error during test:', error);
  }
}

// Run the main function
main();