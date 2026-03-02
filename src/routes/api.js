import express from 'express';
import multer from 'multer';
import path from 'path';
import { db, isAdmin } from '../lib/db.js';

const router = express.Router();

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

function requireAuth(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Nicht eingeloggt' });
  next();
}

async function requireAdmin(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Nicht eingeloggt' });
  const admin = await isAdmin(req.user.id);
  if (!admin) return res.status(403).json({ error: 'Kein Admin' });
  next();
}

// ---- ME ----
router.get('/me', requireAuth, async (req, res) => {
  const admin = await isAdmin(req.user.id);
  const superAdmin = req.user.id === process.env.SUPER_ADMIN_DISCORD_ID;
  res.json({ ...req.user, isAdmin: admin, isSuperAdmin: superAdmin });
});

// ---- MEMBERS ----
router.get('/members', requireAuth, async (req, res) => {
  const rows = await db.execute('SELECT * FROM members ORDER BY id ASC');
  res.json(rows.rows);
});

router.post('/members', requireAdmin, async (req, res) => {
  const { name, rang, handy, invite_datum, wocheneinzahlung, wochenabgabe } = req.body;
  const result = await db.execute({
    sql: 'INSERT INTO members (name,rang,handy,invite_datum,wocheneinzahlung,wochenabgabe) VALUES (?,?,?,?,?,?)',
    args: [name, rang||'', handy||'', invite_datum||'', wocheneinzahlung||0, wochenabgabe||0]
  });
  res.json({ id: Number(result.lastInsertRowid) });
});

router.put('/members/:id', requireAdmin, async (req, res) => {
  const { name, rang, handy, invite_datum, wocheneinzahlung, wochenabgabe } = req.body;
  await db.execute({
    sql: 'UPDATE members SET name=?,rang=?,handy=?,invite_datum=?,wocheneinzahlung=?,wochenabgabe=? WHERE id=?',
    args: [name, rang||'', handy||'', invite_datum||'', wocheneinzahlung||0, wochenabgabe||0, req.params.id]
  });
  res.json({ ok: true });
});

router.delete('/members/:id', requireAdmin, async (req, res) => {
  await db.execute({ sql: 'DELETE FROM members WHERE id=?', args: [req.params.id] });
  res.json({ ok: true });
});

router.post('/members/reset-weekly', requireAdmin, async (req, res) => {
  await db.execute('UPDATE members SET wocheneinzahlung=0, wochenabgabe=0');
  res.json({ ok: true });
});

// ---- FAHRZEUGE ----
router.get('/fahrzeuge', requireAuth, async (req, res) => {
  const rows = await db.execute('SELECT * FROM fahrzeuge ORDER BY id DESC');
  res.json(rows.rows);
});

router.post('/fahrzeuge', requireAuth, async (req, res) => {
  const { name, kennzeichen, bemerkung } = req.body;
  const addedBy = req.user.username || req.user.id;
  const result = await db.execute({
    sql: 'INSERT INTO fahrzeuge (name,kennzeichen,bemerkung,added_by) VALUES (?,?,?,?)',
    args: [name, kennzeichen, bemerkung||'', addedBy]
  });
  await db.execute({
    sql: 'INSERT INTO fahrzeug_logs (aktion,fahrzeug_id,kennzeichen,name,user_discord_id,user_name) VALUES (?,?,?,?,?,?)',
    args: ['HINZUGEFÜGT', Number(result.lastInsertRowid), kennzeichen, name, req.user.id, req.user.username]
  });
  res.json({ id: Number(result.lastInsertRowid) });
});

router.put('/fahrzeuge/:id', requireAdmin, async (req, res) => {
  const { name, kennzeichen, bemerkung, von, bis } = req.body;
  await db.execute({
    sql: 'UPDATE fahrzeuge SET name=?,kennzeichen=?,bemerkung=?,von=?,bis=? WHERE id=?',
    args: [name, kennzeichen, bemerkung||'', von||'', bis||'', req.params.id]
  });
  await db.execute({
    sql: 'INSERT INTO fahrzeug_logs (aktion,fahrzeug_id,kennzeichen,name,user_discord_id,user_name) VALUES (?,?,?,?,?,?)',
    args: ['BEARBEITET', req.params.id, kennzeichen, name, req.user.id, req.user.username]
  });
  res.json({ ok: true });
});

router.delete('/fahrzeuge/:id', requireAdmin, async (req, res) => {
  const existing = await db.execute({ sql: 'SELECT * FROM fahrzeuge WHERE id=?', args: [req.params.id] });
  if (existing.rows.length > 0) {
    const f = existing.rows[0];
    await db.execute({
      sql: 'INSERT INTO fahrzeug_logs (aktion,fahrzeug_id,kennzeichen,name,user_discord_id,user_name) VALUES (?,?,?,?,?,?)',
      args: ['GELÖSCHT', req.params.id, f.kennzeichen, f.name, req.user.id, req.user.username]
    });
  }
  await db.execute({ sql: 'DELETE FROM fahrzeuge WHERE id=?', args: [req.params.id] });
  res.json({ ok: true });
});

// ---- FAHRZEUG LOGS ----
router.get('/fahrzeug-logs', requireAdmin, async (req, res) => {
  const rows = await db.execute('SELECT * FROM fahrzeug_logs ORDER BY created_at DESC LIMIT 200');
  res.json(rows.rows);
});

// ---- ANKAUF ----
router.get('/ankauf', requireAuth, async (req, res) => {
  const rows = await db.execute('SELECT * FROM ankauf ORDER BY id DESC');
  res.json(rows.rows);
});

router.post('/ankauf', requireAdmin, async (req, res) => {
  const { ankaefer, artikel, menge, preis, verkaeufer, datum } = req.body;
  const result = await db.execute({
    sql: 'INSERT INTO ankauf (ankaefer,artikel,menge,preis,verkaeufer,datum) VALUES (?,?,?,?,?,?)',
    args: [ankaefer, artikel, menge||0, preis||0, verkaeufer||'', datum||'']
  });
  res.json({ id: Number(result.lastInsertRowid) });
});

router.delete('/ankauf/:id', requireAdmin, async (req, res) => {
  await db.execute({ sql: 'DELETE FROM ankauf WHERE id=?', args: [req.params.id] });
  res.json({ ok: true });
});

router.get('/ankauf/stats', requireAdmin, async (req, res) => {
  const resetRow = await db.execute("SELECT value FROM settings WHERE key='week_reset'");
  const since = resetRow.rows[0]?.value || '2000-01-01';
  const total = await db.execute({ sql: 'SELECT COUNT(*) as cnt, SUM(preis*menge) as gesamt FROM ankauf WHERE created_at > ?', args: [since] });
  const byArtikel = await db.execute({ sql: 'SELECT artikel, COUNT(*) as cnt, SUM(menge) as gesamtmenge, SUM(preis*menge) as gesamt FROM ankauf WHERE created_at > ? GROUP BY artikel ORDER BY gesamt DESC', args: [since] });
  const byAnkaefer = await db.execute({ sql: 'SELECT ankaefer, COUNT(*) as cnt, SUM(preis*menge) as gesamt FROM ankauf WHERE created_at > ? GROUP BY ankaefer ORDER BY cnt DESC', args: [since] });
  const byVerkaeufer = await db.execute({ sql: "SELECT verkaeufer, COUNT(*) as cnt, SUM(preis*menge) as gesamt FROM ankauf WHERE created_at > ? AND verkaeufer != '' GROUP BY verkaeufer ORDER BY cnt DESC", args: [since] });
  res.json({ total: total.rows[0], byArtikel: byArtikel.rows, byAnkaefer: byAnkaefer.rows, byVerkaeufer: byVerkaeufer.rows });
});

// ---- ANKAUF CLEAR WEEK ----
router.delete('/ankauf/clear-week', requireAdmin, async (req, res) => {
  await db.execute("INSERT OR REPLACE INTO settings (key,value) VALUES ('week_reset', datetime('now'))");
  res.json({ ok: true });
});

// ---- ROUTEN ----
router.get('/routes', requireAuth, async (req, res) => {
  const slots = await db.execute('SELECT * FROM route_slots ORDER BY route, slot_type');
  const images = await db.execute('SELECT * FROM route_images');
  res.json({ slots: slots.rows, images: images.rows });
});

router.put('/routes/slot/:id', requireAdmin, async (req, res) => {
  const { person } = req.body;
  await db.execute({
    sql: 'UPDATE route_slots SET person=?, updated_at=CURRENT_TIMESTAMP WHERE id=?',
    args: [person||'', req.params.id]
  });
  res.json({ ok: true });
});

router.post('/routes/image', requireAdmin, upload.single('image'), async (req, res) => {
  const { route, slot_type } = req.body;
  if (!req.file) return res.status(400).json({ error: 'Kein Bild' });
  const image_path = '/uploads/' + req.file.filename;
  // upsert
  const existing = await db.execute({
    sql: 'SELECT id FROM route_images WHERE route=? AND slot_type=?',
    args: [route, slot_type]
  });
  if (existing.rows.length > 0) {
    await db.execute({
      sql: 'UPDATE route_images SET image_path=?, updated_at=CURRENT_TIMESTAMP WHERE route=? AND slot_type=?',
      args: [image_path, route, slot_type]
    });
  } else {
    await db.execute({
      sql: 'INSERT INTO route_images (route,slot_type,image_path) VALUES (?,?,?)',
      args: [route, slot_type, image_path]
    });
  }
  res.json({ image_path });
});

// Bild hochladen - als Base64 in DB
router.post('/routes/image', requireAdmin, upload.single('image'), async (req, res) => {
  const { route, slot_type } = req.body;
  if (!req.file) return res.status(400).json({ error: 'Kein Bild' });
  const base64 = req.file.buffer.toString('base64');
  const mimeType = req.file.mimetype;
  const dataUrl = `data:${mimeType};base64,${base64}`;
  const existing = await db.execute({ sql: 'SELECT id FROM route_images WHERE route=? AND slot_type=?', args: [route, slot_type] });
  if (existing.rows.length > 0) {
    await db.execute({ sql: 'UPDATE route_images SET image_path=?, updated_at=CURRENT_TIMESTAMP WHERE route=? AND slot_type=?', args: [dataUrl, route, slot_type] });
  } else {
    await db.execute({ sql: 'INSERT INTO route_images (route,slot_type,image_path) VALUES (?,?,?)', args: [route, slot_type, dataUrl] });
  }
  res.json({ ok: true, path: dataUrl });
});

// ---- ADMINS ----
router.get('/admins', requireAuth, async (req, res) => {
  const rows = await db.execute('SELECT * FROM admins ORDER BY added_at DESC');
  const superAdminId = process.env.SUPER_ADMIN_DISCORD_ID;
  res.json({ admins: rows.rows, superAdminId });
});

router.post('/admins', requireAuth, async (req, res) => {
  // Only super admin can add/remove admins
  if (req.user.id !== process.env.SUPER_ADMIN_DISCORD_ID) {
    return res.status(403).json({ error: 'Nur der Super-Admin kann Admins verwalten' });
  }
  const { discord_id, username } = req.body;
  await db.execute({
    sql: 'INSERT OR REPLACE INTO admins (discord_id, username, added_by) VALUES (?,?,?)',
    args: [discord_id, username||'', req.user.id]
  });
  res.json({ ok: true });
});

router.delete('/admins/:discord_id', requireAuth, async (req, res) => {
  if (req.user.id !== process.env.SUPER_ADMIN_DISCORD_ID) {
    return res.status(403).json({ error: 'Nur der Super-Admin kann Admins verwalten' });
  }
  await db.execute({ sql: 'DELETE FROM admins WHERE discord_id=?', args: [req.params.discord_id] });
  res.json({ ok: true });
});

export default router;

// ---- PREISTABELLE ----
router.get('/preistabelle', requireAuth, async (req, res) => {
  const rows = await db.execute('SELECT * FROM preistabelle ORDER BY artikel ASC');
  res.json(rows.rows);
});

router.post('/preistabelle', requireAdmin, async (req, res) => {
  const { artikel, preis, preis_ug } = req.body;
  if (!artikel) return res.status(400).json({ error: 'Artikel erforderlich' });
  const result = await db.execute({
    sql: 'INSERT INTO preistabelle (artikel,preis,preis_ug) VALUES (?,?,?)',
    args: [artikel, preis||0, preis_ug||0]
  });
  res.json({ id: Number(result.lastInsertRowid) });
});

router.put('/preistabelle/:id', requireAdmin, async (req, res) => {
  const { artikel, preis, preis_ug } = req.body;
  await db.execute({
    sql: 'UPDATE preistabelle SET artikel=?,preis=?,preis_ug=? WHERE id=?',
    args: [artikel, preis||0, preis_ug||0, req.params.id]
  });
  res.json({ ok: true });
});

router.delete('/preistabelle/:id', requireAdmin, async (req, res) => {
  await db.execute({ sql: 'DELETE FROM preistabelle WHERE id=?', args: [req.params.id] });
  res.json({ ok: true });
});
