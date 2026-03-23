const express = require('express');
const bcrypt = require('bcryptjs');
const { supabase, getSetting, setSetting } = require('../db/database');
const router = express.Router();

// ── Middleware ────────────────────────────────────────────────
function requireAdmin(req, res, next) {
  if (!req.session.admin) return res.status(401).json({ error: 'Unauthorized' });
  next();
}

// ── Traditional login (kept as fallback) ─────────────────────
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Missing fields' });
  const adminUser = await getSetting('admin_user');
  const adminHash = await getSetting('admin_pass_hash');
  if (username !== adminUser) return res.status(401).json({ error: 'Invalid credentials' });
  const valid = await bcrypt.compare(password, adminHash);
  if (!valid) return res.status(401).json({ error: 'Invalid credentials' });
  req.session.admin = true;
  req.session.email = username + '@local';
  req.session.name = 'Sílvia';
  res.json({ ok: true });
});

// ── Google OAuth via Supabase ─────────────────────────────────

// GET /api/auth/google — redirect to Supabase Google OAuth
router.get('/google', async (req, res) => {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: process.env.SITE_URL + '/api/auth/google/callback'
    }
  });
  if (error || !data?.url) return res.status(500).json({ error: 'OAuth init failed' });
  res.redirect(data.url);
});

// GET /api/auth/google/callback — Supabase redirects here with code
router.get('/google/callback', async (req, res) => {
  const { code } = req.query;
  if (!code) return res.redirect('/?error=no_code');

  try {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (error || !data?.user) return res.redirect('/?error=auth_failed');

    const email = data.user.email;
    const name  = data.user.user_metadata?.full_name || email;

    // Check if this email is an admin
    const { data: adminRow } = await supabase
      .from('admins')
      .select('*')
      .eq('email', email)
      .single();

    if (!adminRow) return res.redirect('/?error=not_admin');

    req.session.admin = true;
    req.session.email = email;
    req.session.name  = name;
    res.redirect('/?admin=1');
  } catch(e) {
    res.redirect('/?error=server_error');
  }
});

// GET /api/auth/me
router.get('/me', (req, res) => {
  res.json({
    admin: !!req.session.admin,
    email: req.session.email || null,
    name:  req.session.name  || null
  });
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  req.session.destroy();
  res.json({ ok: true });
});

// POST /api/auth/change-password
router.post('/change-password', requireAdmin, async (req, res) => {
  const { password } = req.body;
  if (!password || password.length < 6) return res.status(400).json({ error: 'Too short' });
  const hash = await bcrypt.hash(password, 10);
  await setSetting('admin_pass_hash', hash);
  res.json({ ok: true });
});

// ── Admin management ──────────────────────────────────────────

// GET /api/auth/admins
router.get('/admins', requireAdmin, async (req, res) => {
  const { data, error } = await supabase.from('admins').select('*').order('created_at');
  if (error) return res.status(500).json({ error: error.message });
  res.json(data || []);
});

// POST /api/auth/admins
router.post('/admins', requireAdmin, async (req, res) => {
  const { email, name } = req.body;
  if (!email) return res.status(400).json({ error: 'Email required' });
  const { error } = await supabase.from('admins').insert({ email, name: name || email });
  if (error) return res.status(500).json({ error: error.message });
  res.json({ ok: true });
});

// DELETE /api/auth/admins/:id
router.delete('/admins/:id', requireAdmin, async (req, res) => {
  // Prevent deleting yourself
  const { data } = await supabase.from('admins').select('email').eq('id', req.params.id).single();
  if (data?.email === req.session.email) return res.status(400).json({ error: 'Cannot remove yourself' });
  await supabase.from('admins').delete().eq('id', req.params.id);
  res.json({ ok: true });
});

module.exports = router;
module.exports.requireAdmin = requireAdmin;
