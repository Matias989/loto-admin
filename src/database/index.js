import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { mkdirSync, existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dataDir = join(__dirname, '../../data');
if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true });

const db = new Database(join(dataDir, 'guild.db'));

function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS guild_config (
      guild_id TEXT PRIMARY KEY,
      panel_channel_id TEXT,
      panel_message_id TEXT,
      events_channel_id TEXT,
      leader_role_ids TEXT,
      admin_user_ids TEXT,
      fund_percentage REAL DEFAULT 0.10,
      management_percentage REAL DEFAULT 0.05,
      no_show_penalty INTEGER DEFAULT 0,
      leader_multiplier REAL DEFAULT 1.5,
      rank_recluta_points INTEGER DEFAULT 0,
      rank_miembro_points INTEGER DEFAULT 10,
      rank_activo_points INTEGER DEFAULT 50,
      rank_veterano_points INTEGER DEFAULT 150,
      inactive_days INTEGER DEFAULT 14,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS users (
      guild_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      discord_username TEXT,
      registered_at DATETIME,
      total_points INTEGER DEFAULT 0,
      weekly_points INTEGER DEFAULT 0,
      balance REAL DEFAULT 0,
      rank TEXT DEFAULT 'recluta',
      last_activity DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (guild_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS balance_transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guild_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      amount REAL NOT NULL,
      balance_after REAL,
      type TEXT NOT NULL,
      reason TEXT,
      event_id INTEGER,
      created_by TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (event_id) REFERENCES events(id)
    );

    CREATE TABLE IF NOT EXISTS activity_points (
      guild_id TEXT NOT NULL,
      activity_type TEXT NOT NULL,
      base_points INTEGER NOT NULL,
      PRIMARY KEY (guild_id, activity_type)
    );

    CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guild_id TEXT NOT NULL,
      creator_id TEXT NOT NULL,
      activity_type TEXT NOT NULL,
      name TEXT,
      scheduled_at DATETIME NOT NULL,
      max_participants INTEGER DEFAULT 8,
      base_points INTEGER NOT NULL,
      is_profitable INTEGER DEFAULT 0,
      fund_percentage REAL DEFAULT 0.10,
      total_profit INTEGER DEFAULT 0,
      status TEXT DEFAULT 'active',
      leader_id TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      closed_at DATETIME
    );

    CREATE TABLE IF NOT EXISTS event_participants (
      event_id INTEGER NOT NULL,
      user_id TEXT NOT NULL,
      attended INTEGER DEFAULT 0,
      is_leader INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (event_id, user_id),
      FOREIGN KEY (event_id) REFERENCES events(id)
    );

    CREATE TABLE IF NOT EXISTS point_transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guild_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      points INTEGER NOT NULL,
      reason TEXT NOT NULL,
      event_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (event_id) REFERENCES events(id)
    );

    CREATE TABLE IF NOT EXISTS benefits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guild_id TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      cost INTEGER NOT NULL,
      requires_manual INTEGER DEFAULT 0,
      role_id TEXT,
      active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS benefit_redemptions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guild_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      benefit_id INTEGER NOT NULL,
      status TEXT DEFAULT 'pending',
      processed_by TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      processed_at DATETIME,
      FOREIGN KEY (benefit_id) REFERENCES benefits(id)
    );

    CREATE TABLE IF NOT EXISTS guild_fund (
      guild_id TEXT PRIMARY KEY,
      balance INTEGER DEFAULT 0,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS fund_transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guild_id TEXT NOT NULL,
      amount INTEGER NOT NULL,
      category TEXT NOT NULL,
      description TEXT,
      event_id INTEGER,
      user_id TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (event_id) REFERENCES events(id)
    );

    CREATE TABLE IF NOT EXISTS weekly_cycles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guild_id TEXT NOT NULL,
      week_start DATETIME NOT NULL,
      week_end DATETIME NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_events_guild_status ON events(guild_id, status);
    CREATE INDEX IF NOT EXISTS idx_users_guild ON users(guild_id);
    CREATE INDEX IF NOT EXISTS idx_point_transactions_user ON point_transactions(guild_id, user_id);
    CREATE INDEX IF NOT EXISTS idx_fund_transactions_guild ON fund_transactions(guild_id);
    CREATE TABLE IF NOT EXISTS event_announcements (
      event_id INTEGER PRIMARY KEY,
      channel_id TEXT NOT NULL,
      message_id TEXT NOT NULL,
      FOREIGN KEY (event_id) REFERENCES events(id)
    );

    CREATE INDEX IF NOT EXISTS idx_balance_transactions_user ON balance_transactions(guild_id, user_id);
  `);

  try { db.prepare('SELECT panel_message_id FROM guild_config LIMIT 1').get(); } catch { db.exec('ALTER TABLE guild_config ADD COLUMN panel_message_id TEXT'); }
  try { db.prepare('SELECT balance FROM users LIMIT 1').get(); } catch { db.exec('ALTER TABLE users ADD COLUMN balance REAL DEFAULT 0'); }
  try { db.prepare('SELECT discord_username FROM users LIMIT 1').get(); } catch { db.exec('ALTER TABLE users ADD COLUMN discord_username TEXT'); }
  try { db.prepare('SELECT registered_at FROM users LIMIT 1').get(); } catch { db.exec('ALTER TABLE users ADD COLUMN registered_at DATETIME'); }
  try { db.prepare('SELECT admin_user_ids FROM guild_config LIMIT 1').get(); } catch { db.exec('ALTER TABLE guild_config ADD COLUMN admin_user_ids TEXT'); }
  try { db.prepare('SELECT affects_accounting FROM events LIMIT 1').get(); } catch { db.exec('ALTER TABLE events ADD COLUMN affects_accounting INTEGER DEFAULT 1'); }
}

initDatabase();

export default db;
export { initDatabase };
