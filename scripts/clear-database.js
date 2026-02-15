/**
 * Script para limpiar toda la base de datos.
 * Ejecutar con: node scripts/clear-database.js
 * 
 * IMPORTANTE: Detén el bot antes de ejecutar este script.
 */
import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const dbPath = join(__dirname, '../data/guild.db');

console.log('Limpiando base de datos...');

const db = new Database(dbPath);

try {
  db.exec('PRAGMA foreign_keys = OFF');
  
  const tables = [
    'event_participants',
    'point_transactions',
    'balance_transactions',
    'benefit_redemptions',
    'fund_transactions',
    'event_announcements',
    'weekly_cycles',
    'activity_points',
    'benefits',
    'events',
    'users',
    'guild_fund',
    'guild_config'
  ];

  for (const table of tables) {
    try {
      db.prepare(`DELETE FROM ${table}`).run();
      console.log(`  ✓ ${table}`);
    } catch (err) {
      if (err.message.includes('no such table')) {
        console.log(`  - ${table} (no existe)`);
      } else {
        console.error(`  ✗ ${table}:`, err.message);
      }
    }
  }

  db.exec('PRAGMA foreign_keys = ON');
  db.close();
  
  console.log('\nBase de datos limpiada correctamente.');
} catch (err) {
  console.error('Error:', err.message);
  process.exit(1);
}
