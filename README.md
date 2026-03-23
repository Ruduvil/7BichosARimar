# 7 Bichos a Rimar — Website

Site oficial do livro de poesia infantil *7 Bichos a Rimar* de Sílvia Duarte.

---

## Credenciais de admin (padrão)
- **Utilizador:** `silvia`
- **Palavra-passe:** `bichos2024`

> Muda a palavra-passe no painel admin após o primeiro login!

---

## Estrutura do projeto

```
bichos-server/
├── server.js          ← Servidor principal
├── package.json
├── .env.example       ← Copia para .env e preenche
├── db/
│   └── database.js    ← Base de dados SQLite
├── routes/
│   ├── auth.js        ← Login / logout
│   └── api.js         ← Galeria, encomendas, mensagens
├── public/            ← Frontend (HTML, CSS, JS)
│   ├── index.html
│   ├── style.css
│   └── app.js
└── uploads/           ← Imagens (criado automaticamente)
```

---

## Correr localmente

```bash
# 1. Instalar dependências
npm install

# 2. Criar ficheiro de ambiente
cp .env.example .env
# Edita o .env e muda SESSION_SECRET

# 3. Arrancar o servidor
npm start
# ou para desenvolvimento (reinicia automaticamente):
npm run dev

# 4. Abrir no browser
# http://localhost:3000
```

---

## Deploy no Railway (passo a passo)

### 1. Criar conta e projecto
1. Vai a [railway.app](https://railway.app) e cria uma conta (podes usar GitHub)
2. Clica em **"New Project"** → **"Deploy from GitHub repo"**
3. Liga a tua conta GitHub e selecciona este repositório

### 2. Configurar variáveis de ambiente no Railway
No painel do Railway, vai a **Variables** e adiciona:

| Variável | Valor |
|---|---|
| `NODE_ENV` | `production` |
| `SESSION_SECRET` | Uma string longa e aleatória (ex: `abc123xyz789...`) |
| `DB_PATH` | `/data/data.db` |
| `UPLOADS_DIR` | `/data/uploads` |

> ⚠️ **Importante:** O Railway precisa de um **volume persistente** para guardar a base de dados e as imagens. Sem isto, os dados apagam-se cada vez que o servidor reinicia!

### 3. Adicionar volume persistente no Railway
1. No painel do projecto, clica em **"Add Volume"**
2. Mount path: `/data`
3. Isso garante que `data.db` e `uploads/` sobrevivem a reinícios

### 4. Deploy automático
O Railway detecta `package.json` e corre `npm start` automaticamente.
Cada vez que fizeres `git push`, o site actualiza-se sozinho.

### 5. Domínio personalizado (opcional)
- No Railway: **Settings** → **Domains** → adiciona o teu domínio
- Ou usa o domínio gratuito `.up.railway.app` que o Railway dá

---

## Subir para GitHub (passo a passo)

```bash
# Na pasta do projecto:
git init
git add .
git commit -m "primeiro commit — 7 Bichos a Rimar"

# Cria um repositório novo em github.com (pode ser privado)
# Depois:
git remote add origin https://github.com/O_TEU_UTILIZADOR/7-bichos-a-rimar.git
git push -u origin main
```

---

## Funcionalidades

- ✅ Site multi-página (Início, O Livro, Galeria, Encomendar, Contacto)
- ✅ Responsivo — funciona em telemóvel e computador
- ✅ Painel de administração protegido por palavra-passe
- ✅ Upload da capa do livro e imagens da galeria
- ✅ Lightbox para ver imagens em grande
- ✅ Sistema de encomendas com referência única
- ✅ Formulário de contacto com caixa de entrada no admin
- ✅ Gestão de encomendas (pendente / confirmado)
- ✅ Alterar textos do site sem tocar em código
- ✅ Alterar preço do livro
- ✅ Alterar palavra-passe de administrador
- ✅ 4 temas de cor
- ✅ Base de dados SQLite persistente
- ✅ Imagens guardadas no servidor

---

## Suporte

Se tiveres dúvidas, abre uma issue no GitHub ou contacta quem desenvolveu o site.
