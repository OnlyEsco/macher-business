import { createClient } from '@libsql/client';
import dotenv from 'dotenv';
dotenv.config();

export const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

export async function initDB() {
  await db.batch([
    // Users / Members table
    `CREATE TABLE IF NOT EXISTS members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      rang TEXT DEFAULT '',
      handy TEXT DEFAULT '',
      invite_datum TEXT DEFAULT '',
      wocheneinzahlung REAL DEFAULT 0,
      wochenabgabe REAL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,

    // Admins table
    `CREATE TABLE IF NOT EXISTS admins (
      discord_id TEXT PRIMARY KEY,
      username TEXT,
      added_by TEXT,
      added_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,

    // Fahrzeuge
    `CREATE TABLE IF NOT EXISTS fahrzeuge (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      kennzeichen TEXT NOT NULL,
      bemerkung TEXT DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,

    // Fahrzeug Logs
    `CREATE TABLE IF NOT EXISTS fahrzeug_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      aktion TEXT NOT NULL,
      fahrzeug_id INTEGER,
      kennzeichen TEXT,
      name TEXT,
      user_discord_id TEXT,
      user_name TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,

    // Ankauf
    `CREATE TABLE IF NOT EXISTS ankauf (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ankaefer TEXT NOT NULL,
      artikel TEXT NOT NULL,
      menge INTEGER DEFAULT 0,
      preis REAL DEFAULT 0,
      verkaeufer TEXT DEFAULT '',
      datum TEXT DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,

    // Routen - Zuweisung von Personen zu Slots
    `CREATE TABLE IF NOT EXISTS route_slots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      route TEXT NOT NULL,
      slot_type TEXT NOT NULL,
      person TEXT DEFAULT '',
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,

    // Route Bilder
    `CREATE TABLE IF NOT EXISTS route_images (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      route TEXT NOT NULL,
      slot_type TEXT NOT NULL,
      image_path TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
  ], 'write');

  // Seed default route slots if empty
  const existing = await db.execute('SELECT COUNT(*) as cnt FROM route_slots');
  if (existing.rows[0].cnt === 0) {
    const defaultSlots = [
      // AMPHETAMIN
      ['AMPHETAMIN', 'feld'], ['AMPHETAMIN', 'verarbeiter_1'], ['AMPHETAMIN', 'verarbeiter_2'],
      // WESTEN
      ['WESTEN', 'feld_1'], ['WESTEN', 'feld_2'], ['WESTEN', 'verarbeiter'],
      // ZINK
      ['ZINK', 'feld'], ['ZINK', 'schnell_verarbeiter'], ['ZINK', 'workstation'],
      // EISEN
      ['EISEN', 'feld'], ['EISEN', 'schnell_verarbeiter'], ['EISEN', 'workstation'],
      // KUPFER
      ['KUPFER', 'feld'], ['KUPFER', 'schnell_verarbeiter'], ['KUPFER', 'workstation'],
      // HOLZ
      ['HOLZ', 'feld'], ['HOLZ', 'verarbeiter'],
    ];
    for (const [route, slot_type] of defaultSlots) {
      await db.execute({
        sql: 'INSERT INTO route_slots (route, slot_type, person) VALUES (?,?,?)',
        args: [route, slot_type, '']
      });
    }
  }

  console.log('✅ Datenbank initialisiert');
}

export async function isAdmin(discord_id) {
  if (discord_id === process.env.SUPER_ADMIN_DISCORD_ID) return true;
  const result = await db.execute({
    sql: 'SELECT 1 FROM admins WHERE discord_id = ?',
    args: [discord_id]
  });
  return result.rows.length > 0;
}
