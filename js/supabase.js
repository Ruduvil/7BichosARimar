// Substitui isto pelas credenciais reais que encontras no painel do Supabase.
const SUPABASE_URL = 'ATUALIZA_NO_SUPABASE_PROJECT_URL';
const SUPABASE_KEY = 'ATUALIZA_NO_SUPABASE_ANON_KEY';

if (window.supabase) {
  window.supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
} else {
  console.warn("Supabase CDN não carregou corretamente.");
}
