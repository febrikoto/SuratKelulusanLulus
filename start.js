/**
 * Script starter untuk aplikasi SKL di Niagahoster
 * 
 * File ini menjadi entry point untuk aplikasi Node.js di Niagahoster
 * dan akan menjalankan aplikasi yang sudah di-build
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Periksa apakah .env ada
if (!fs.existsSync('.env')) {
  console.error('ERROR: File .env tidak ditemukan!');
  console.error('Pastikan file .env dengan konfigurasi database sudah dibuat');
  process.exit(1);
}

// Periksa apakah build ada
if (!fs.existsSync('dist/index.js')) {
  console.error('ERROR: File dist/index.js tidak ditemukan!');
  console.error('Pastikan aplikasi sudah di-build dengan benar');
  
  // Mencoba mode development jika build tidak ada
  console.log('Mencoba menjalankan dalam mode development...');
  if (!fs.existsSync('server/index.ts')) {
    console.error('ERROR: File server/index.ts tidak ditemukan!');
    console.error('Struktur aplikasi tidak lengkap');
    process.exit(1);
  }
}

// Log informasi startup
console.log('=== SKL Application Startup ===');
console.log('Starting time:', new Date().toISOString());
console.log('Node version:', process.version);
console.log('Working directory:', process.cwd());
console.log('Environment:', process.env.NODE_ENV || 'development');

// Jalankan aplikasi yang sudah di-build jika ada
// Atau mode development jika build tidak ditemukan
const serverProcess = fs.existsSync('dist/index.js') 
  ? spawn('node', ['dist/index.js'], {
      stdio: 'inherit',
      env: { ...process.env, NODE_ENV: process.env.NODE_ENV || 'production' }
    })
  : spawn('npx', ['tsx', 'server/index.ts'], {
      stdio: 'inherit',
      env: { ...process.env, NODE_ENV: process.env.NODE_ENV || 'development' }
    });

// Tangkap signal keluar dan teruskan ke child process
process.on('SIGINT', () => {
  console.log('Received SIGINT, shutting down...');
  serverProcess.kill('SIGINT');
});

process.on('SIGTERM', () => {
  console.log('Received SIGTERM, shutting down...');
  serverProcess.kill('SIGTERM');
});

// Tangkap event exit dari child process
serverProcess.on('exit', (code, signal) => {
  if (code !== 0) {
    console.error(`Server process exited with code ${code}`);
    process.exit(code);
  }
});