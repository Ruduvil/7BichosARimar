const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { supabase, getSetting, setSetting } = require('../db/database');
const { requireAdmin } = require('./auth');
const router = express.Router();

// ── Multer (image uploads stored locally, then served as /uploads) ──
const UPLOADS_DIR = process.env.UPLOADS_DIR || path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, Date.now() + '-' + Math.random().toString(36).slice(2) + ext);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (req, file, cb) => cb(null, /\.(jpg|jpeg|png|webp|gif)$/i.test(file.originalname))
});

// ── SETTINGS ──────────────────────────────────────────────────
router.get('/settings', async (req, res) => {
  const [heroTitle, heroDesc, price, bookCover, theme] = await Promise.all([
    getSetting('hero_title'),
    getSetting('hero_desc'),
    getSetting('book_price'),
    getSetting('book_cover'),
    getSetting('theme'),
  ]);
  res.json({ heroTitle, heroDesc, price: parseFloat(price) || 10, bookCover: bookCover || null, theme: theme || 'forest' });
});

router.patch('/settings', requireAdmin, async (req, res) => {
  const { heroTitle, heroDesc, price, theme } = req.body;
  const updates = [];
  if (heroTitle !== undefined) updates.push(setSetting('hero_title', heroTitle));
  if (heroDesc  !== undefined) updates.push(setSetting('hero_desc',  heroDesc));
  if (price     !== undefined) updates.push(setSetting('book_price', parseFloat(price) || 10));
  if (theme     !== undefined) updates.push(setSetting('theme', theme));
  await Promise.all(updates);
  res.json({ ok: true });
});

router.post('/settings/cover', requireAdmin, upload.single('cover'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file' });
  const old = await getSetting('book_cover');
  if (old) {
    const oldPath = path.join(UPLOADS_DIR, path.basename(old));
    if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
  }
  const url = '/uploads/' + req.file.filename;
  await setSetting('book_cover', url);
  res.json({ ok: true, url });
});

// ── GALLERY ───────────────────────────────────────────────────
router.get('/gallery', async (req, res) => {
  let query = supabase.from('gallery').select('*').order('created_at', { ascending: false });
  if (req.query.category) query = query.eq('category', req.query.category);
  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  res.json((data || []).map(r => ({ ...r, src: '/uploads/' + r.filename })));
});

router.post('/gallery', requireAdmin, upload.single('image'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file' });
  const { caption = '', category = 'illustrations' } = req.body;
  const { data, error } = await supabase
    .from('gallery')
    .insert({ filename: req.file.filename, caption, category })
    .select()
    .single();
  if (error) return res.status(500).json({ error: error.message });
  res.json({ ok: true, id: data.id, src: '/uploads/' + req.file.filename });
});

router.delete('/gallery/:id', requireAdmin, async (req, res) => {
  const { data } = await supabase.from('gallery').select('filename').eq('id', req.params.id).single();
  if (!data) return res.status(404).json({ error: 'Not found' });
  await supabase.from('gallery').delete().eq('id', req.params.id);
  const filePath = path.join(UPLOADS_DIR, data.filename);
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  res.json({ ok: true });
});

// ── ORDERS ────────────────────────────────────────────────────
router.post('/orders', async (req, res) => {
  const { name, email, phone, address, zip, city, note, qty, payment } = req.body;
  if (!name || !email || !address || !zip || !city || !qty || !payment)
    return res.status(400).json({ error: 'Missing required fields' });
  const price = parseFloat(await getSetting('book_price')) || 10;
  const total = price * parseInt(qty);
  const ref = 'BCH-' + Math.random().toString(36).toUpperCase().slice(2, 8);
  const { error } = await supabase.from('orders').insert({
    ref, name, email, phone: phone || '', address, zip, city,
    note: note || '', qty: parseInt(qty), unit_price: price, total, payment
  });
  if (error) return res.status(500).json({ error: error.message });
  res.json({ ok: true, ref });
});

router.get('/orders', requireAdmin, async (req, res) => {
  const { data, error } = await supabase.from('orders').select('*').order('created_at', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data || []);
});

router.patch('/orders/:id/status', requireAdmin, async (req, res) => {
  await supabase.from('orders').update({ status: req.body.status }).eq('id', req.params.id);
  res.json({ ok: true });
});

// ── MESSAGES ──────────────────────────────────────────────────
router.post('/messages', async (req, res) => {
  const { name, email, subject, message } = req.body;
  if (!name || !email || !message) return res.status(400).json({ error: 'Missing fields' });
  const { error } = await supabase.from('messages').insert({ name, email, subject: subject || '', message });
  if (error) return res.status(500).json({ error: error.message });
  res.json({ ok: true });
});

router.get('/messages', requireAdmin, async (req, res) => {
  const { data, error } = await supabase.from('messages').select('*').order('created_at', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data || []);
});

router.patch('/messages/:id/read', requireAdmin, async (req, res) => {
  await supabase.from('messages').update({ read: true }).eq('id', req.params.id);
  res.json({ ok: true });
});

// ── STATS ─────────────────────────────────────────────────────
router.get('/stats', requireAdmin, async (req, res) => {
  const [ordersRes, imagesRes, messagesRes, revenueRes] = await Promise.all([
    supabase.from('orders').select('*', { count: 'exact', head: true }),
    supabase.from('gallery').select('*', { count: 'exact', head: true }),
    supabase.from('messages').select('*', { count: 'exact', head: true }),
    supabase.from('orders').select('total').eq('status', 'confirmed'),
  ]);
  const revenue = (revenueRes.data || []).reduce((sum, o) => sum + (o.total || 0), 0);
  res.json({
    orders:   ordersRes.count   || 0,
    images:   imagesRes.count   || 0,
    messages: messagesRes.count || 0,
    revenue
  });
});

module.exports = router;
