# 7 Bichos a Rimar - Novo Website

Este é o novo website, criado apenas com HTML, CSS e JavaScript (Vanilla), sem necessidade de instalação de NodeJS ou linha de comandos no teu computador local.

## Como usar
Este projeto está pronto para ser enviado para o **GitHub** e diretamente associado ao **Railway** (ou Vercel/Netlify), que irá detetar automaticamente que se trata de um site estático.

## Funcionalidades
1. **Página Inicial (`index.html`)**: O livro e a sua história.
2. **Galeria (`illustrations.html`)**: Espaço para as ilustrações.
3. **Página de Compra (`order.html`)**: Formulário simulado para encomenda de livros.
4. **Painel de Administração (`admin.html`)**: Um local onde tu (o dono) podes fazer login e alterar os textos do site sem tocar no código.

## Configuração do Supabase (Base de Dados e Admin)
Para que o painel de administração e o registo de encomendas funcione, precisas de criar um projeto gratuito no [Supabase](https://supabase.com):
1. Cria a conta e o projeto.
2. Vai a **Project Settings > API** e copia o teu `Project URL` e `anon key`.
3. Abre o ficheiro `js/supabase.js` e substitui `'ATUALIZA_NO_SUPABASE_PROJECT_URL'` e a key pelas tuas.
4. No painel do Supabase, vai ao **SQL Editor** e corre este código para criar as tuas tabelas:

```sql
CREATE TABLE site_content (
  id text primary key,
  content text not null,
  updated_at timestamp with time zone default now()
);

CREATE TABLE orders (
  id uuid primary key default uuid_generate_v4(),
  customer_name text not null,
  email text not null,
  address text not null,
  status text default 'pending',
  created_at timestamp with time zone default now()
);

-- Insere o teu texto base
INSERT INTO site_content (id, content) VALUES
('hero-title', 'A magia das palavras para as crianças'),
('hero-desc', 'Um livro cheio de rimas cativantes e ilustrações únicas...'),
('about-text', 'Criado com muito amor e dedicação...');
```
5. Cria o teu utilizador de administrador no separador **Authentication > Add User**. Usa esse email e senha para entrares no `admin.html`!
