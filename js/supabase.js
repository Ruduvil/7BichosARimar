// Substitui isto pelas credenciais reais que encontras no painel do Supabase.
const SUPABASE_URL = 'https://wfsrotpoiblitvulptjk.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indmc3JvdHBvaWJsaXR2dWxwdGprIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQyNTM2MTksImV4cCI6MjA4OTgyOTYxOX0.OF2fRugd-508a6OUOJouKM3QpsMy1dn1fTVxLct_bUk';

if (window.supabase) {
  window.supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
} else {
  console.warn("Supabase CDN não carregou corretamente.");
}
