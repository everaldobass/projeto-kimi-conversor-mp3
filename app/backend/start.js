#!/usr/bin/env node

const { exec } = require('child_process');
const path = require('path');

console.log('🚀 Iniciando YouTube MP3 Converter...\n');

// Iniciar backend
const backend = exec('node server.js', {
  cwd: __dirname,
  env: { ...process.env, PORT: '3001' }
});

backend.stdout.on('data', (data) => {
  console.log(`[Backend] ${data.trim()}`);
});

backend.stderr.on('data', (data) => {
  console.error(`[Backend Error] ${data.trim()}`);
});

backend.on('close', (code) => {
  console.log(`Backend encerrado com código ${code}`);
});

console.log('📌 Backend iniciado em http://localhost:3001');
console.log('📌 Para iniciar o frontend, execute: cd .. && npm run dev\n');

// Manter processo vivo
process.on('SIGINT', () => {
  console.log('\n👋 Encerrando servidor...');
  backend.kill();
  process.exit(0);
});
