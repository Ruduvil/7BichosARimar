const loginSection = document.getElementById('loginSection');
const dashboardSection = document.getElementById('dashboardSection');
const loginForm = document.getElementById('loginForm');
const btnLogout = document.getElementById('btnLogout');

// Tab Switching
window.switchTab = function(tabName) {
  const tabs = document.querySelectorAll('.tab-btn');
  tabs.forEach(t => t.classList.remove('active'));
  
  if(tabName === 'content') {
    tabs[0].classList.add('active');
    document.getElementById('tabContent').classList.remove('hidden');
    document.getElementById('tabOrders').classList.add('hidden');
  } else {
    tabs[1].classList.add('active');
    document.getElementById('tabContent').classList.add('hidden');
    document.getElementById('tabOrders').classList.remove('hidden');
    loadOrders();
  }
}

// Verifica sessão ativa
document.addEventListener('DOMContentLoaded', async () => {
  if (!window.supabaseClient || SUPABASE_URL === 'ATUALIZA_NO_SUPABASE_PROJECT_URL') {
    document.getElementById('loginError').innerText = "As chaves do Supabase não estão configuradas (ver js/supabase.js). Não podes fazer login.";
    return;
  }

  const { data: { session } } = await window.supabaseClient.auth.getSession();
  if (session) {
    showDashboard();
  }
});

// Login
loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('adminEmail').value;
  const password = document.getElementById('adminPassword').value;

  const { data, error } = await window.supabaseClient.auth.signInWithPassword({
    email, password
  });

  if (error) {
    document.getElementById('loginError').innerText = "Erro: " + error.message;
  } else {
    showDashboard();
  }
});

btnLogout.addEventListener('click', async () => {
  await window.supabaseClient.auth.signOut();
  loginSection.classList.remove('hidden');
  dashboardSection.classList.add('hidden');
  btnLogout.classList.add('hidden');
});

async function showDashboard() {
  loginSection.classList.add('hidden');
  dashboardSection.classList.remove('hidden');
  btnLogout.classList.remove('hidden');

  // Load current content info into inputs
  const { data, error } = await window.supabaseClient.from('site_content').select('*');
  if (data) {
    data.forEach(item => {
      if(item.id === 'hero-title') document.getElementById('editHeroTitle').value = item.content;
      if(item.id === 'hero-desc') document.getElementById('editHeroDesc').value = item.content;
      if(item.id === 'about-text') document.getElementById('editAboutText').value = item.content;
    });
  }
}

// Save Content
document.getElementById('btnSaveContent').addEventListener('click', async () => {
  const title = document.getElementById('editHeroTitle').value;
  const desc = document.getElementById('editHeroDesc').value;
  const about = document.getElementById('editAboutText').value;

  const updates = [
    { id: 'hero-title', content: title },
    { id: 'hero-desc', content: desc },
    { id: 'about-text', content: about }
  ];

  const { error } = await window.supabaseClient.from('site_content').upsert(updates);
  const msg = document.getElementById('saveMsg');
  if (error) {
    msg.innerText = "Erro ao guardar: " + error.message;
    msg.style.color = "red";
  } else {
    msg.innerText = "Informação guardada com sucesso! As alterações já estão no site.";
    setTimeout(() => msg.innerText = "", 3000);
  }
});

async function loadOrders() {
  const list = document.getElementById('ordersList');
  list.innerHTML = "A carregar...";
  const { data, error } = await window.supabaseClient.from('orders').select('*').order('created_at', { ascending: false });
  
  if (error) {
    list.innerHTML = "Erro ao ler encomendas.";
  } else if (data && data.length > 0) {
    list.innerHTML = "";
    data.forEach(order => {
      const li = document.createElement('li');
      li.style = "padding: 1rem; border: 1px solid #e2e8f0; margin-bottom: 1rem; border-radius: 8px;";
      li.innerHTML = `<strong>${order.customer_name}</strong> (${order.email}) <br><span style="color: #718096; font-size: 0.9rem;">${order.address}</span> <br><span style="background: var(--secondary); padding: 2px 8px; border-radius: 4px; font-size: 0.85rem;">Status: ${order.status}</span>`;
      list.appendChild(li);
    });
  } else {
    list.innerHTML = "Não existem encomendas registadas.";
  }
}
