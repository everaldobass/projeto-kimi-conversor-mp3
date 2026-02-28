# 🎧 YouTube MP3 Converter v2.0

Aplicativo completo para converter vídeos do YouTube para MP3 com gerenciamento de playlist, player de música com **controle de stems estilo Moises** e banco de dados SQLite3.

![Preview](https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=1200&h=600&fit=crop)

## ✨ Novidades da v2.0

- 🗄️ **Banco de Dados SQLite3** - Persistência local de músicas e dados
- 🎚️ **Player com Stems** - Controle de volume individual (Vocal, Bateria, Baixo, Outros)
- 🔌 **Backend Node.js + Express** - API REST completa
- 📡 **Conversão Real** - Integração com processo de conversão
- 🎛️ **Interface Estilo Moises** - Controles deslizantes para cada faixa

## 🚀 Tecnologias

### Frontend
- React 18 + TypeScript + Vite
- Tailwind CSS + shadcn/ui
- Zustand (estado global)
- Framer Motion (animações)
- Axios (HTTP client)

### Backend
- Node.js + Express
- SQLite3 (banco de dados local)
- CORS + Helmet + Morgan
- Separação real de stems com Demucs/Spleeter (opcional)

## 📋 Pré-requisitos

- Node.js 18+
- npm ou yarn
- Python 3 (para separação real de stems)
- ffmpeg

## 🛠️ Instalação e Uso

### Opção 1: Script Automático (Linux/Mac)

```bash
# Dê permissão de execução
chmod +x start-all.sh

# Execute
./start-all.sh
```

### Opção 2: Manualmente

#### 1. Instalar dependências do Frontend

```bash
npm install
```

#### 2. Instalar dependências do Backend

```bash
cd ../backend
npm install
cd ../frontend
```

#### 2.1 (Opcional) Instalar engine de separação real

```bash
# opção recomendada
python3 -m pip install demucs

# alternativa
python3 -m pip install spleeter
```

#### 2.2 Configurar variáveis de ambiente

Frontend:

```bash
cp .env.example .env
```

Backend:

```bash
cp ../backend/.env.example ../backend/.env
```

#### 3. Iniciar Backend

```bash
cd ../backend
node server.js
```

O backend estará rodando em: **http://localhost:3001**

#### 4. Iniciar Frontend (em outro terminal)

```bash
npm run dev
```

O frontend estará em: **http://localhost:5173**

Por padrão, o frontend consome a API via `VITE_API_URL=/api`, usando proxy do Vite para `http://localhost:3001`.

---

## 📁 Estrutura do Projeto

```
projeto-kimi-conversor-mp3/
├── backend/                 # Backend Node.js (API)
│   ├── database/
│   │   ├── db.js           # Banco de dados JSON
│   │   └── uuid-polyfill.js
│   ├── uploads/            # MP3s convertidos
│   ├── stems/              # Stems separados
│   ├── server.js           # Servidor Express
│   └── package.json
└── frontend/               # Aplicação React (Vite)
    ├── src/
│   ├── components/
│   │   ├── StemPlayer.tsx  # Player com controles de stems
│   │   ├── Sidebar.tsx
│   │   └── ThemeProvider.tsx
│   ├── pages/              # Páginas da aplicação
│   ├── services/
│   │   └── api.ts          # APIs do backend
│   ├── store/              # Zustand stores
│   └── types/              # Tipos TypeScript
    ├── dist/               # Build de produção
    ├── start-all.sh        # Script de inicialização local
    └── package.json
```

---

## 🎯 Como Usar

### 1. Primeiro Acesso

1. Acesse `http://localhost:5173`
2. Crie uma conta em "Criar conta" ou faça login
3. Qualquer email/senha funcionam para teste

### 2. Converter um Vídeo

1. Vá em **"Converter"**
2. Cole a URL do YouTube
3. (Opcional) Ative **"Separar Faixas"** para stems
4. Clique em **"Converter para MP3"**
5. Aguarde o processamento

### 3. Usar o Player com Stems

1. Clique em qualquer música para tocar
2. No player inferior, clique no ícone **🎚️ SlidersHorizontal**
3. Um painel se abrirá com controles individuais:
   - 🎤 **Vocal** - Controle do volume da voz
   - 🥁 **Bateria** - Controle da percussão
   - 🎸 **Baixo** - Controle do baixo
   - 🎵 **Outros** - Controle dos demais instrumentos

4. Use os sliders para ajustar cada faixa individualmente!

### 4. Gerenciar Playlist

- **Playlist** - Visualize todas as músicas
- **Favoritos** - Músicas marcadas com ❤️
- **Histórico** - Conversões realizadas

---

## 🔌 API Endpoints

### Autenticação
- `POST /api/auth/register` - Registrar usuário
- `POST /api/auth/login` - Login

### Músicas
- `GET /api/songs` - Listar músicas do usuário
- `GET /api/songs/:id` - Detalhes da música
- `POST /api/songs/:id/favorite` - Favoritar/desfavoritar
- `DELETE /api/songs/:id` - Remover música
- `GET /api/download/:id` - Baixar MP3

### Conversão
- `POST /api/convert` - Iniciar conversão
- `GET /api/history/:id/status` - Status da conversão

### Stems
- `GET /api/songs/:id/stems` - Listar stems da música
- `PATCH /api/stems/:id/volume` - Atualizar volume do stem

### Histórico
- `GET /api/history` - Histórico de conversões
- `DELETE /api/history/:id` - Remover do histórico

### Estatísticas
- `GET /api/stats` - Estatísticas do usuário

---

## 🗄️ Banco de Dados

O banco SQLite3 está localizado em:
```
backend/database/database.sqlite
```

### Estrutura das Tabelas

**users**
- id, nome, email, senha, perfil, ativo, dataCadastro

**songs**
- id, titulo, artista, genero, duracao, caminhoArquivo, thumbnail, favorito, dataUpload, usuarioId

**stems**
- id, musicaId, tipo (VOCAL/BATERIA/BAIXO/OUTRO), caminhoArquivo, volume

**history**
- id, url, status, titulo, thumbnail, mensagemErro, dataInicio, dataFim, usuarioId

---

## 🎨 Personalização

### Temas

O aplicativo suporta tema Dark e Light. Alterne pelo toggle na tela de login.

### Cores dos Stems

```typescript
const stemConfig = {
  VOCAL:   { color: 'from-pink-500 to-rose-500',   icon: Mic2 },
  BATERIA: { color: 'from-blue-500 to-cyan-500',   icon: Drum },
  BAIXO:   { color: 'from-amber-500 to-orange-500', icon: Guitar },
  OUTRO:   { color: 'from-purple-500 to-violet-500', icon: Music2 },
};
```

---

## 📦 Scripts Disponíveis

### Frontend
```bash
npm run dev      # Desenvolvimento
npm run build    # Build de produção
npm run preview  # Preview do build
```

### Backend
```bash
cd ../backend
node server.js           # Iniciar servidor
node start.js            # Script com logs coloridos
```

### Tudo junto
```bash
./start-all.sh   # Linux/Mac
```

---

## 🔮 Melhorias Futuras

- [ ] Integração real com yt-dlp
- [ ] Separação de stems com Spleeter/Demucs
- [ ] WebSocket para status em tempo real
- [ ] Upload para AWS S3
- [ ] PWA (Progressive Web App)
- [ ] Modo offline

---

## 🐛 Solução de Problemas

### Erro: "Cannot connect to backend"
Verifique se o backend está rodando em http://localhost:3001

### Erro: "Port already in use"
Mude a porta no arquivo `../backend/server.js`

### Limpar dados
Delete o arquivo `../backend/database/database.json` para resetar o banco

---

## 📝 Licença

MIT License - Open Source

---

## Melhorias
# bash
- sudo apt update
- sudo apt install python3-pip
- sudo apt install python3-venv
- python3 -m venv .venv
- source .venv/bin/activate

### Base
python3 -m pip install demucs
# ou
python3 -m pip install spleeter



# Desenvolvido com ❤️ usando React + Node.js
