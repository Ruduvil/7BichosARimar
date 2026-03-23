const express = require('express');
const bcrypt = require('bcryptjs');
const { getSetting, setSetting } = require('../db/database');
const router = express.Router();

router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Missing fields' });
  const adminUser = await getSetting('admin_user');
  const adminHash = await getSetting('admin_pass_hash');
  if (username !== adminUser) return res.status(401).json({ error: 'Invalid credentials' });
  const valid = await bcrypt.compare(password, adminHash);
  if (!valid) return res.status(401).json({ error: 'Invalid credentials' });
  req.session.admin = true;
  res.json({ ok: true });
});

router.post('/logout', (req, res) => {
  req.session.destroy();
  res.json({ ok: true });
});

router.get('/me', (req, res) => {
  res.json({ admin: !!req.session.admin });
});

router.post('/change-password', requireAdmin, async (req, res) => {
  const { password } = req.body;
  if (!password || password.length < 6) return res.status(400).json({ error: 'Password too short' });
  const hash = await bcrypt.hash(password, 10);
  await setSetting('admin_pass_hash', hash);
  res.json({ ok: true });
});

function requireAdmin(req, res, next) {
  if (!req.session.admin) return res.status(401).json({ error: 'Unauthorized' });
  next();
}

module.exports = router;
module.exports.requireAdmin = requireAdmin;
