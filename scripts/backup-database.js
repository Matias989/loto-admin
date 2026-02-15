#!/usr/bin/env node
import { copyFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '..');
const dbPath = join(projectRoot, 'data', 'guild.db');
const backupPath = join(projectRoot, 'guild-backup.db');

if (!existsSync(dbPath)) {
  console.error('No se encontró data/guild.db');
  process.exit(1);
}

copyFileSync(dbPath, backupPath);
console.log('Backup creado: guild-backup.db');
console.log('Súbelo con: scp guild-backup.db ubuntu@TU_IP:~/albion-guild/data/guild.db');
