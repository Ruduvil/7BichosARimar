/* ===========================
   7 BICHOS — APP.JS (API version)
   =========================== */

const STATE = {
  isAdmin: false,
  qty: 1,
  price: 10,
  galleryCache: { illustrations: [], events: [] },
  lightboxImages: [],
  lightboxIndex: 0,
  galleryUploadFile: null,
  coverUploadFile: null,
};

// ── API helper ────────────────────────────────────────────────
async function api(method, path, body, isForm) {
  const opts = { method, credentials: 'include' };
  if (body) {
    if (isForm) {
      opts.body = body;
    } else {
      opts.headers = { 'Content-Type': 'application/json' };
      opts.body = JSON.stringify(body);
    }
  }
  const r = await fetch('/api' + path, opts);
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.error || 'API error');
  return data;
}

// ── Init ──────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  window.addEventListener('scroll', () =>
    document.getElementById('navbar').classList.toggle('scrolled', window.scrollY > 20));
  await loadSettings();
  await checkAuth();
  renderGallery('illustrations');
});

async function loadSettings() {
  try {
    const s = await api('GET', '/settings');
    STATE.price = s.price || 10;
    updatePrices();

    const titleEl = document.getElementById('heroTitle');
    const descEl  = document.getElementById('heroDesc');
    if (titleEl && s.heroTitle) titleEl.textContent = s.heroTitle;
    if (descEl  && s.heroDesc)  descEl.textContent  = s.heroDesc;

    const pricePageEl = document.getElementById('bookPagePrice');
    if (pricePageEl) pricePageEl.textContent = fmt(STATE.price);

    if (s.bookCover) {
      setBookCover(s.bookCover);
    }
    if (s.theme) applyTheme(s.theme);

    // Pre-fill content editor
    const et = document.getElementById('editHeroTitle');
    const ed = document.getElementById('editHeroDesc');
    const ep = document.getElementById('editPrice');
    if (et) et.value = s.heroTitle || '';
    if (ed) ed.value = s.heroDesc  || '';
    if (ep) ep.value = s.price     || 10;
  } catch(e) { console.warn('Settings load failed', e); }
}

function setBookCover(url) {
  const img = document.getElementById('bookCoverImg');
  const ph  = document.getElementById('bookCoverPh');
  if (img) { img.src = url; img.style.display = 'block'; }
  if (ph)  ph.style.display = 'none';
}

async function checkAuth() {
  try {
    const { admin } = await api('GET', '/auth/me');
    setAdminState(admin);
  } catch(e) { setAdminState(false); }
}

function setAdminState(isAdmin) {
  STATE.isAdmin = isAdmin;
  document.getElementById('adminNavBtn').style.display = isAdmin ? '' : 'none';
  document.getElementById('loginBtn').style.display    = isAdmin ? 'none' : '';
  document.getElementById('logoutBtn').style.display   = isAdmin ? '' : 'none';
}

// ── Navigation ────────────────────────────────────────────────
function showPage(name) {
  if (name === 'admin' && !STATE.isAdmin) { showPage('login'); return; }
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById('page-' + name).classList.add('active');
  document.getElementById('site-footer').style.display =
    (name === 'admin' || name === 'login') ? 'none' : '';
  window.scrollTo({ top: 0, behavior: 'smooth' });
  if (name === 'gallery') renderGallery('illustrations');
  if (name === 'admin')   loadAdminData();
}

function toggleMenu() {
  document.getElementById('navLinks').classList.toggle('open');
  document.getElementById('hamburger').classList.toggle('open');
}
function closeMenu() {
  document.getElementById('navLinks').classList.remove('open');
  document.getElementById('hamburger').classList.remove('open');
}

// ── Auth ──────────────────────────────────────────────────────
async function doLogin() {
  const username = document.getElementById('loginUser').value.trim();
  const password = document.getElementById('loginPass').value;
  const errEl = document.getElementById('loginError');
  try {
    await api('POST', '/auth/login', { username, password });
    errEl.style.display = 'none';
    document.getElementById('loginUser').value = '';
    document.getElementById('loginPass').value = '';
    setAdminState(true);
    showPage('admin');
  } catch(e) {
    errEl.style.display = 'block';
    setTimeout(() => errEl.style.display = 'none', 3000);
  }
}

async function doLogout() {
  await api('POST', '/auth/logout');
  setAdminState(false);
  showPage('home');
}

// ── Admin ─────────────────────────────────────────────────────
async function loadAdminData() {
  try {
    const stats = await api('GET', '/stats');
    document.getElementById('statOrders').textContent   = stats.orders;
    document.getElementById('statImages').textContent   = stats.images;
    document.getElementById('statMessages').textContent = stats.messages;
    document.getElementById('statRevenue').textContent  = '€' + stats.revenue.toFixed(2);
  } catch(e) {}
}

function switchAdmin(panel, btn) {
  document.querySelectorAll('.admin-panel').forEach(p => p.classList.remove('active-panel'));
  document.querySelectorAll('.admin-nav-item').forEach(b => b.classList.remove('active'));
  document.getElementById('admin-' + panel).classList.add('active-panel');
  if (btn) btn.classList.add('active');
  else document.querySelectorAll('.admin-nav-item').forEach(b => {
    if (b.textContent.toLowerCase().includes(panel.slice(0,4))) b.classList.add('active');
  });
  if (panel === 'gallery')  loadAdminGallery();
  if (panel === 'orders')   loadOrders();
  if (panel === 'messages') loadMessages();
  if (panel === 'dashboard') loadAdminData();
}

// ── Content editor ────────────────────────────────────────────
async function saveContent() {
  const heroTitle = document.getElementById('editHeroTitle').value;
  const heroDesc  = document.getElementById('editHeroDesc').value;
  const price     = parseFloat(document.getElementById('editPrice').value) || 10;

  try {
    await api('PATCH', '/settings', { heroTitle, heroDesc, price });

    // Upload cover if selected
    if (STATE.coverUploadFile) {
      const fd = new FormData();
      fd.append('cover', STATE.coverUploadFile);
      const res = await api('POST', '/settings/cover', fd, true);
      setBookCover(res.url);
      STATE.coverUploadFile = null;
    }

    STATE.price = price;
    updatePrices();
    document.getElementById('heroTitle').textContent = heroTitle;
    document.getElementById('heroDesc').textContent  = heroDesc;

    const notice = document.getElementById('contentSaved');
    notice.style.display = 'inline-block';
    setTimeout(() => notice.style.display = 'none', 2500);
  } catch(e) { alert('Erro ao guardar: ' + e.message); }
}

function uploadBookCover(event) {
  const file = event.target.files[0];
  if (!file) return;
  STATE.coverUploadFile = file;
  const reader = new FileReader();
  reader.onload = (e) => {
    document.getElementById('bookCoverPreview').innerHTML =
      `<img src="${e.target.result}" style="max-height:100px;border-radius:4px"/>`;
  };
  reader.readAsDataURL(file);
}

// ── Gallery ───────────────────────────────────────────────────
async function renderGallery(cat) {
  cat = cat || 'illustrations';
  try {
    const imgs = await api('GET', '/gallery?category=' + cat);
    STATE.galleryCache[cat] = imgs;
    const grid  = document.getElementById(cat + 'Grid');
    const empty = document.getElementById(cat + 'Empty');
    grid.innerHTML = '';
    if (!imgs.length) { empty.style.display = 'block'; return; }
    empty.style.display = 'none';
    imgs.forEach((img, idx) => {
      const div = document.createElement('div');
      div.className = 'gallery-item';
      div.onclick = () => openLightbox(imgs, idx);
      div.innerHTML = `<img src="${img.src}" alt="${img.caption}"/><div class="gallery-item-caption">${img.caption}</div>`;
      grid.appendChild(div);
    });
  } catch(e) { console.warn('Gallery load failed', e); }
}

function switchGallery(cat, btn) {
  document.querySelectorAll('.gallery-section').forEach(s => s.classList.remove('active-gallery'));
  document.querySelectorAll('.gallery-tab').forEach(b => b.classList.remove('active'));
  document.getElementById('gallery-' + cat).classList.add('active-gallery');
  btn.classList.add('active');
  renderGallery(cat);
}

function openLightbox(images, idx) {
  STATE.lightboxImages = images;
  STATE.lightboxIndex = idx;
  document.getElementById('lightbox').classList.add('open');
  updateLightbox();
}
function updateLightbox() {
  const img = STATE.lightboxImages[STATE.lightboxIndex];
  document.getElementById('lightboxImg').src = img.src;
  document.getElementById('lightboxCaption').textContent = img.caption;
}
function closeLightbox() { document.getElementById('lightbox').classList.remove('open'); }
function lightboxNav(dir) {
  STATE.lightboxIndex = (STATE.lightboxIndex + dir + STATE.lightboxImages.length) % STATE.lightboxImages.length;
  updateLightbox();
}
document.addEventListener('keydown', e => {
  if (!document.getElementById('lightbox').classList.contains('open')) return;
  if (e.key === 'Escape') closeLightbox();
  if (e.key === 'ArrowRight') lightboxNav(1);
  if (e.key === 'ArrowLeft')  lightboxNav(-1);
});

// ── Admin Gallery ─────────────────────────────────────────────
async function loadAdminGallery() {
  try {
    const imgs = await api('GET', '/gallery');
    const grid = document.getElementById('adminGalleryGrid');
    if (!imgs.length) { grid.innerHTML = '<div class="empty-admin">Ainda não há imagens.</div>'; return; }
    grid.innerHTML = '';
    imgs.forEach(img => {
      const div = document.createElement('div');
      div.className = 'admin-gallery-item';
      div.innerHTML = `<img src="${img.src}" alt="${img.caption}"/><button onclick="removeGalleryImage(${img.id})">✕</button>`;
      grid.appendChild(div);
    });
  } catch(e) {}
}

function previewGalleryUpload(event) {
  const file = event.target.files[0];
  if (!file) return;
  STATE.galleryUploadFile = file;
  const reader = new FileReader();
  reader.onload = e => {
    const prev = document.getElementById('galleryPreviewImg');
    prev.src = e.target.result;
    prev.style.display = 'block';
  };
  reader.readAsDataURL(file);
}

async function addGalleryImage() {
  if (!STATE.galleryUploadFile) { alert('Escolhe uma imagem primeiro.'); return; }
  const caption = document.getElementById('galleryCaption').value.trim();
  const category = document.getElementById('galleryCat').value;
  const fd = new FormData();
  fd.append('image', STATE.galleryUploadFile);
  fd.append('caption', caption);
  fd.append('category', category);
  try {
    await api('POST', '/gallery', fd, true);
    STATE.galleryUploadFile = null;
    document.getElementById('galleryPreviewImg').style.display = 'none';
    document.getElementById('galleryCaption').value = '';
    document.getElementById('galleryUpload').value = '';
    loadAdminGallery();
    loadAdminData();
  } catch(e) { alert('Erro ao adicionar imagem: ' + e.message); }
}

async function removeGalleryImage(id) {
  if (!confirm('Tens a certeza que queres remover esta imagem?')) return;
  try {
    await api('DELETE', '/gallery/' + id);
    loadAdminGallery();
    loadAdminData();
  } catch(e) { alert('Erro ao remover: ' + e.message); }
}

// ── Orders ────────────────────────────────────────────────────
function changeQty(delta) {
  STATE.qty = Math.max(1, Math.min(99, STATE.qty + delta));
  updatePrices();
}

function fmt(n) { return '€' + n.toFixed(2).replace('.', ','); }

function updatePrices() {
  const total = STATE.price * STATE.qty;
  const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  set('qtyDisplay',   STATE.qty);
  set('unitPrice',    fmt(STATE.price));
  set('totalPrice',   fmt(total));
  set('summaryQty',   STATE.qty);
  set('summaryTotal', fmt(total));
  set('summaryFinal', fmt(total));
}

function selectPayment(label, value) {
  document.querySelectorAll('.payment-method').forEach(m => m.classList.remove('active'));
  label.classList.add('active');
}

function goToPayment() {
  const fields = ['orderName','orderEmail','orderAddress','orderZip','orderCity'];
  for (const id of fields) {
    if (!document.getElementById(id).value.trim()) { alert('Por favor preenche todos os campos obrigatórios (*).'); return; }
  }
  if (!document.getElementById('orderEmail').value.includes('@')) { alert('Email inválido.'); return; }
  document.getElementById('orderStep1').classList.remove('active-step');
  document.getElementById('orderStep2').classList.add('active-step');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function goToStep1() {
  document.getElementById('orderStep2').classList.remove('active-step');
  document.getElementById('orderStep1').classList.add('active-step');
}

async function submitOrder() {
  const btn = document.getElementById('submitOrderBtn');
  btn.disabled = true; btn.textContent = 'A processar...';
  try {
    const res = await api('POST', '/orders', {
      name:     document.getElementById('orderName').value,
      email:    document.getElementById('orderEmail').value,
      phone:    document.getElementById('orderPhone').value,
      address:  document.getElementById('orderAddress').value,
      zip:      document.getElementById('orderZip').value,
      city:     document.getElementById('orderCity').value,
      note:     document.getElementById('orderNote').value,
      qty:      STATE.qty,
      payment:  document.querySelector('input[name="payment"]:checked')?.value || 'mb'
    });
    document.getElementById('orderRef').textContent = res.ref;
    document.getElementById('orderStep2').classList.remove('active-step');
    document.getElementById('orderStep3').classList.add('active-step');
    STATE.qty = 1; updatePrices();
  } catch(e) {
    alert('Erro ao submeter encomenda: ' + e.message);
  } finally {
    btn.disabled = false; btn.textContent = 'Confirmar encomenda 🎉';
  }
}

async function loadOrders() {
  const wrap = document.getElementById('ordersTable');
  try {
    const orders = await api('GET', '/orders');
    if (!orders.length) { wrap.innerHTML = '<div class="empty-admin">📦 Ainda não há encomendas.</div>'; return; }
    wrap.innerHTML = `<table class="orders-table">
      <thead><tr><th>Ref.</th><th>Nome</th><th>Qtd.</th><th>Total</th><th>Pagamento</th><th>Data</th><th>Estado</th><th></th></tr></thead>
      <tbody>${orders.map(o => `<tr>
        <td><strong>${o.ref}</strong></td>
        <td>${o.name}<br><small style="color:#888">${o.email}</small></td>
        <td>${o.qty}</td>
        <td>€${o.total.toFixed(2)}</td>
        <td>${{mb:'MB/MBWay',transfer:'Transferência',paypal:'PayPal'}[o.payment]||o.payment}</td>
        <td>${o.created_at.slice(0,10)}</td>
        <td><span class="status-badge ${o.status==='pending'?'status-pending':'status-confirmed'}">${o.status==='pending'?'Pendente':'Confirmado'}</span></td>
        <td>${o.status==='pending'?`<button onclick="confirmOrder(${o.id})" style="background:none;border:none;cursor:pointer;color:var(--green);font-weight:500">✓ Confirmar</button>`:'✓'}</td>
      </tr>`).join('')}</tbody>
    </table>`;
  } catch(e) { wrap.innerHTML = '<div class="empty-admin">Erro ao carregar encomendas.</div>'; }
}

async function confirmOrder(id) {
  try {
    await api('PATCH', '/orders/' + id + '/status', { status: 'confirmed' });
    loadOrders(); loadAdminData();
  } catch(e) { alert('Erro: ' + e.message); }
}

// ── Messages ──────────────────────────────────────────────────
async function submitContact() {
  const name    = document.getElementById('contactName').value.trim();
  const email   = document.getElementById('contactEmail').value.trim();
  const message = document.getElementById('contactMessage').value.trim();
  if (!name || !email || !message) { alert('Preenche os campos obrigatórios.'); return; }
  try {
    await api('POST', '/messages', { name, email, subject: document.getElementById('contactSubject').value, message });
    document.getElementById('contactSuccess').style.display = 'block';
    document.getElementById('contactName').value = '';
    document.getElementById('contactEmail').value = '';
    document.getElementById('contactMessage').value = '';
    setTimeout(() => document.getElementById('contactSuccess').style.display = 'none', 4000);
  } catch(e) { alert('Erro ao enviar mensagem.'); }
}

async function loadMessages() {
  const wrap = document.getElementById('messagesTable');
  try {
    const msgs = await api('GET', '/messages');
    if (!msgs.length) { wrap.innerHTML = '<div class="empty-admin">✉️ Ainda não há mensagens.</div>'; return; }
    wrap.innerHTML = `<table class="orders-table">
      <thead><tr><th>Nome</th><th>Email</th><th>Assunto</th><th>Mensagem</th><th>Data</th><th></th></tr></thead>
      <tbody>${msgs.map(m => `<tr style="${m.read?'':'font-weight:500;background:#fffef0'}">
        <td>${m.name}</td>
        <td><a href="mailto:${m.email}" style="color:var(--green)">${m.email}</a></td>
        <td>${m.subject||'—'}</td>
        <td style="max-width:220px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${m.message}</td>
        <td>${m.created_at.slice(0,10)}</td>
        <td>${!m.read?`<button onclick="markRead(${m.id})" style="background:none;border:none;cursor:pointer;color:var(--green);font-size:.8rem">✓ Lida</button>`:'✓'}</td>
      </tr>`).join('')}</tbody>
    </table>`;
  } catch(e) { wrap.innerHTML = '<div class="empty-admin">Erro ao carregar mensagens.</div>'; }
}

async function markRead(id) {
  try { await api('PATCH', '/messages/' + id + '/read'); loadMessages(); } catch(e) {}
}

// ── Settings ──────────────────────────────────────────────────
async function changePassword() {
  const p1 = document.getElementById('newPass1').value;
  const p2 = document.getElementById('newPass2').value;
  const msg = document.getElementById('passMsg');
  if (!p1 || p1.length < 6) { msg.innerHTML = '❌ Mínimo 6 caracteres.'; msg.style.display = 'block'; return; }
  if (p1 !== p2) { msg.innerHTML = '❌ As palavras-passe não coincidem.'; msg.style.display = 'block'; return; }
  try {
    await api('POST', '/auth/change-password', { password: p1 });
    msg.innerHTML = '✅ Palavra-passe alterada!';
    msg.style.display = 'block';
    document.getElementById('newPass1').value = '';
    document.getElementById('newPass2').value = '';
    setTimeout(() => msg.style.display = 'none', 3000);
  } catch(e) { msg.innerHTML = '❌ Erro: ' + e.message; msg.style.display = 'block'; }
}

// ── Themes ────────────────────────────────────────────────────
const THEMES = {
  forest: { green:'#2D5016','green-light':'#4A7C2F','green-pale':'#EAF3DE', amber:'#BA7517','amber-light':'#e8a030','amber-pale':'#FEF3DC', cream:'#FDF8F0' },
  ocean:  { green:'#1a3a5c','green-light':'#2c6096','green-pale':'#e0eaf5', amber:'#e88c30','amber-light':'#f0a840','amber-pale':'#fef3e0', cream:'#f0f6ff' },
  berry:  { green:'#5c1a3a','green-light':'#962c62','green-pale':'#f5e0ea', amber:'#e8309a','amber-light':'#f050b0','amber-pale':'#ffe0f5', cream:'#fff0f8' },
  noir:   { green:'#2c2c2c','green-light':'#4a4a4a','green-pale':'#f0ede8', amber:'#c0a060','amber-light':'#d4b878','amber-pale':'#faf5e8', cream:'#f8f5f0' }
};

async function setTheme(name) {
  applyTheme(name);
  document.querySelectorAll('.theme-swatch').forEach(s => s.classList.remove('active-theme'));
  event.target.classList.add('active-theme');
  try { await api('PATCH', '/settings', { theme: name }); } catch(e) {}
}

function applyTheme(name) {
  const t = THEMES[name]; if (!t) return;
  const r = document.documentElement;
  Object.entries(t).forEach(([k,v]) => r.style.setProperty('--' + k, v));
}

// ── Google OAuth via Supabase JS (browser-side) ──────────────
const _supabase = window._supabaseClient;

async function doGoogleLogin() {
  try {
    const { error } = await _supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin }
    });
    if (error) alert('Erro ao iniciar login Google: ' + error.message);
  } catch(e) {
    alert('Erro: ' + e.message);
  }
}

// Handle redirect back from Google
(async function() {
  const hash = window.location.hash;
  if (!hash.includes('access_token')) return;

  // Parse token directly from URL hash — most reliable method
  const params = new URLSearchParams(hash.slice(1));
  const access_token = params.get('access_token');
  if (!access_token) return;

  // Clean URL
  history.replaceState({}, '', '/');

  try {
    // Get user info directly with the access token
    const res = await fetch('https://wfsrotpoiblitvulptjk.supabase.co/auth/v1/user', {
      headers: {
        'Authorization': 'Bearer ' + access_token,
        'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indmc3JvdHBvaWJsaXR2dWxwdGprIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQyNTM2MTksImV4cCI6MjA4OTgyOTYxOX0.OF2fRugd-508a6OUOJouKM3QpsMy1dn1fTVxLct_bUk'
      }
    });
    const user = await res.json();
    if (!user.email) throw new Error('no_user');

    // Send email to our server to create session
    await api('POST', '/auth/google', {
      email: user.email,
      name: user.user_metadata?.full_name || user.email
    });
    await checkAuth();
    showPage('admin');
  } catch(e) {
    if (e.message === 'not_admin') {
      alert('Este email não tem permissão de administrador.');
    } else {
      alert('Erro de autenticação. Tenta novamente.');
      console.error(e);
    }
    showPage('login');
  }
})();

// ── Admin management ──────────────────────────────────────────
async function loadAdmins() {
  const wrap = document.getElementById('adminsList');
  if (!wrap) return;
  try {
    const admins = await api('GET', '/auth/admins');
    if (!admins.length) { wrap.innerHTML = '<div class="empty-admin">Nenhum administrador ainda.</div>'; return; }
    wrap.innerHTML = admins.map(a => `
      <div class="admin-row">
        <div class="admin-row-info">
          <strong>${a.name || a.email}</strong>
          <small>${a.email}</small>
        </div>
        <div style="display:flex;align-items:center;gap:.5rem">
          ${a.email === (STATE.currentEmail || '') ? '<span class="admin-row-you">Tu</span>' : ''}
          <button class="admin-row-del" onclick="removeAdmin(${a.id}, '${a.email}')">✕ Remover</button>
        </div>
      </div>`).join('');
  } catch(e) { wrap.innerHTML = '<div class="empty-admin">Erro ao carregar.</div>'; }
}

async function addAdmin() {
  const email = document.getElementById('newAdminEmail').value.trim();
  const name  = document.getElementById('newAdminName').value.trim();
  const msg   = document.getElementById('adminAddMsg');
  if (!email) { msg.innerHTML = '❌ Email obrigatório.'; msg.style.display='block'; return; }
  try {
    await api('POST', '/auth/admins', { email, name });
    document.getElementById('newAdminEmail').value = '';
    document.getElementById('newAdminName').value  = '';
    msg.innerHTML = '✅ Administrador adicionado!';
    msg.style.display = 'block';
    setTimeout(() => msg.style.display = 'none', 3000);
    loadAdmins();
  } catch(e) {
    msg.innerHTML = '❌ ' + e.message;
    msg.style.display = 'block';
  }
}

async function removeAdmin(id, email) {
  if (!confirm(`Remover ${email} como administrador?`)) return;
  try {
    await api('DELETE', '/auth/admins/' + id);
    loadAdmins();
  } catch(e) { alert('Erro: ' + e.message); }
}

// Patch switchAdmin to handle admins panel
const _origSwitchAdmin = switchAdmin;
switchAdmin = function(panel, btn) {
  _origSwitchAdmin(panel, btn);
  if (panel === 'admins') loadAdmins();
};

// Patch checkAuth to store email
const _origCheckAuth = checkAuth;
checkAuth = async function() {
  try {
    const { admin, email, name } = await api('GET', '/auth/me');
    STATE.currentEmail = email;
    setAdminState(admin);
  } catch(e) { setAdminState(false); }
};
