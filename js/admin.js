const loginSection = document.getElementById('loginSection');
const dashboardSection = document.getElementById('dashboardSection');
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
    document.getElementById('loginError').style.color = "red";
    return;
  }

  // Com o OAuth/Magic Link a sessão pode ser validada no load.
  const { data: { session } } = await window.supabaseClient.auth.getSession();
  if (session) {
    showDashboard();
  }
});

// Magic Link Login
const btnMagicLink = document.getElementById('btnMagicLink');
if(btnMagicLink) {
  btnMagicLink.addEventListener('click', async (e) => {
    e.preventDefault();
    const email = document.getElementById('adminEmail').value;
    if(!email) {
      document.getElementById('loginError').innerText = "Insere o teu email no campo acima primeiro!";
      document.getElementById('loginError').style.color = "red";
      return;
    }

    document.getElementById('loginError').innerText = "A enviar Link Mágico para o teu email...";
    document.getElementById('loginError').style.color = "orange";

    const { error } = await window.supabaseClient.auth.signInWithOtp({
      email: email,
      options: {
        emailRedirectTo: window.location.origin + window.location.pathname
      }
    });

    if (error) {
      document.getElementById('loginError').innerText = "Erro: " + error.message;
      document.getElementById('loginError').style.color = "red";
    } else {
      document.getElementById('loginError').innerText = "Link mágico enviado! Verifica o teu email (e a pasta de spam) e clica no botão fornecido para entrar.";
      document.getElementById('loginError').style.color = "green";
    }
  });
}

// Google Login
const btnGoogle = document.getElementById('btnGoogle');
if(btnGoogle) {
  btnGoogle.addEventListener('click', async (e) => {
    e.preventDefault();
    document.getElementById('loginError').innerText = "A redirecionar para o Google...";
    document.getElementById('loginError').style.color = "orange";
    
    const { data, error } = await window.supabaseClient.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin + window.location.pathname
      }
    });
    
    if (error) {
      document.getElementById('loginError').innerText = "Erro: " + error.message;
      document.getElementById('loginError').style.color = "red";
    }
  });
}

// Logout
btnLogout.addEventListener('click', async () => {
  await window.supabaseClient.auth.signOut();
  loginSection.classList.remove('hidden');
  dashboardSection.classList.add('hidden');
  btnLogout.classList.add('hidden');
  document.getElementById('adminEmail').value = '';
  document.getElementById('loginError').innerText = '';
});

// Dashboard
async function showDashboard() {
  loginSection.classList.add('hidden');
  dashboardSection.classList.remove('hidden');
  btnLogout.classList.remove('hidden');

  const { data, error } = await window.supabaseClient.from('site_content').select('*');
  if (data) {
    data.forEach(item => {
      if(item.id === 'hero-title') document.getElementById('editHeroTitle').value = item.content;
      if(item.id === 'hero-desc') document.getElementById('editHeroDesc').value = item.content;
      if(item.id === 'about-text') document.getElementById('editAboutText').value = item.content;
    });
  }
}

// Guardar Textos
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

// Ler encomendas
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
      li.innerHTML = `<strong>${order.customer_name}</strong> (${order.email}) <br><span style="color: #718096; font-size: 0.9rem;">${order.address}</span> <br><span style="background: var(--secondary); padding: 2px 8px; border-radius: 4px; font-size: 0.85rem; color: #1a202c;">Status: ${order.status}</span>`;
      list.appendChild(li);
    });
  } else {
    list.innerHTML = "Não existem encomendas registadas.";
  }
}
