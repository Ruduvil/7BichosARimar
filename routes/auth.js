const express = require('express');
const bcrypt = require('bcryptjs');
const { supabase, getSetting, setSetting } = require('../db/database');
const router = express.Router();

function requireAdmin(req, res, next) {
  if (!req.session.admin) return res.status(401).json({ error: 'Unauthorized' });
  next();
}

// Traditional login
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Missing fields' });
  const adminUser = await getSetting('admin_user');
  const adminHash = await getSetting('admin_pass_hash');
  if (username !== adminUser) return res.status(401).json({ error: 'Invalid credentials' });
  const valid = await bcrypt.compare(password, adminHash);
  if (!valid) return res.status(401).json({ error: 'Invalid credentials' });
  req.session.admin = true;
  req.session.email = 'admin@local';
  req.session.name = 'Admin';
  res.json({ ok: true });
});

// Google login — frontend sends email after Supabase auth
router.post('/google', async (req, res) => {
  const { email, name } = req.body;
  if (!email) return res.status(400).json({ error: 'No email' });

  // Check if this email is in the admins table
  const { data: adminRow } = await supabase
    .from('admins')
    .select('*')
    .eq('email', email)
    .single();

  if (!adminRow) return res.status(403).json({ error: 'not_admin' });

  req.session.admin = true;
  req.session.email = email;
  req.session.name  = name || email;
  res.json({ ok: true });
});

router.get('/me', (req, res) => {
  res.json({
    admin: !!req.session.admin,
    email: req.session.email || null,
    name:  req.session.name  || null
  });
});

router.post('/logout', (req, res) => {
  req.session.destroy();
  res.json({ ok: true });
});

router.post('/change-password', requireAdmin, async (req, res) => {
  const { password } = req.body;
  if (!password || password.length < 6) return res.status(400).json({ error: 'Too short' });
  const hash = await bcrypt.hash(password, 10);
  await setSetting('admin_pass_hash', hash);
  res.json({ ok: true });
});

router.get('/admins', requireAdmin, async (req, res) => {
  const { data, error } = await supabase.from('admins').select('*').order('created_at');
  if (error) return res.status(500).json({ error: error.message });
  res.json(data || []);
});

router.post('/admins', requireAdmin, async (req, res) => {
  const { email, name } = req.body;
  if (!email) return res.status(400).json({ error: 'Email required' });
  const { error } = await supabase.from('admins').insert({ email, name: name || email });
  if (error) return res.status(500).json({ error: error.message });
  res.json({ ok: true });
});

router.delete('/admins/:id', requireAdmin, async (req, res) => {
  const { data } = await supabase.from('admins').select('email').eq('id', req.params.id).single();
  if (data?.email === req.session.email) return res.status(400).json({ error: 'Cannot remove yourself' });
  await supabase.from('admins').delete().eq('id', req.params.id);
  res.json({ ok: true });
});

module.exports = router;
module.exports.requireAdmin = requireAdmin;
