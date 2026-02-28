# Documentacao Tecnica e Arquitetura

## 1. Visao geral
Projeto dividido em dois modulos independentes:
- `frontend/`: SPA React (Vite + TypeScript) responsavel pela UI e consumo da API.
- `backend/`: API REST em Node.js/Express responsavel por autenticacao mock, conversao, historico e servico de arquivos.

Com essa separacao, frontend e backend podem ser versionados, executados e implantados de forma independente.

## 2. Estrutura de pastas
```txt
projeto-kimi-conversor-mp3/
├── backend/
│   ├── database/
│   │   ├── db.js
│   │   ├── database.json
│   │   └── uuid-polyfill.js
│   ├── uploads/
│   ├── stems/
│   ├── server.js
│   ├── start.js
│   ├── package.json
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── services/
│   │   ├── store/
│   │   └── types/
│   ├── index.html
│   ├── vite.config.ts
│   ├── package.json
│   ├── start-all.sh
│   └── .env.example
└── docs/
    └── ARQUITETURA_TECNICA.md
```

## 3. Arquitetura logica
### 3.1 Frontend
- Camada de apresentacao em React.
- Gerenciamento de estado com Zustand.
- Cliente HTTP com Axios (`src/services/api.ts`).
- Roteamento com `react-router-dom`.
- UI baseada em Radix + Tailwind.

Fluxo principal:
1. Usuario realiza login/cadastro.
2. Token mock e salvo em store (`authStore`).
3. Requisicoes incluem `Authorization: Bearer <token>` via interceptor.
4. Telas de conversao, historico e playlist consomem endpoints REST da API.

### 3.2 Backend
- API Express em `backend/server.js`.
- Middleware de seguranca e observabilidade: Helmet, CORS, Morgan.
- Persistencia local em arquivo JSON (`backend/database/database.json`) via modulo `db.js`.
- Conversao de audio usando `yt-dlp` + `ffmpeg` (dependencias de sistema).
- Separacao de stems opcional com engines Python (`demucs`/`spleeter`).

Fluxo principal:
1. `POST /api/convert` cria item de historico e retorna imediatamente.
2. Conversao continua em background.
3. Ao concluir, grava musica e stems, atualiza historico para `DONE`.
4. Frontend consulta status em `GET /api/history/:id/status`.

### 3.3 Integracao frontend-backend
- Em desenvolvimento, o frontend usa proxy Vite:
  - `/api` -> `http://localhost:3001`
  - `/uploads` -> `http://localhost:3001`
  - `/stems` -> `http://localhost:3001`
- URL base da API configurada por `VITE_API_URL` (padrao: `/api`).
- CORS no backend pode ser ajustado por `FRONTEND_ORIGINS`.

## 4. Endpoints principais da API
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/songs`
- `GET /api/songs/:id`
- `POST /api/songs/:id/favorite`
- `DELETE /api/songs/:id`
- `POST /api/convert`
- `GET /api/history`
- `GET /api/history/:id/status`
- `DELETE /api/history/:id`
- `GET /api/songs/:id/stems`
- `PATCH /api/stems/:id/volume`
- `GET /api/stats`
- `GET /api/download/:id`
- `GET /api/health`

## 5. Dependencias utilizadas
### 5.1 Frontend (`frontend/package.json`)
Dependencias de runtime (principais):
- React 19, React DOM 19
- React Router DOM 7
- Axios
- Zustand
- Framer Motion
- Tailwind CSS + tailwind-merge
- Radix UI (familia `@radix-ui/*`)
- React Hook Form + Zod
- Recharts

Dependencias de desenvolvimento (principais):
- Vite 7 + `@vitejs/plugin-react`
- TypeScript 5
- ESLint 9 + plugins
- PostCSS + Autoprefixer

### 5.2 Backend (`backend/package.json`)
- Express
- CORS
- Helmet
- Morgan

### 5.3 Dependencias externas (sistema)
- Node.js 18+
- npm
- Python 3 (opcional, para stems)
- ffmpeg
- yt-dlp
- demucs ou spleeter (opcional)

## 6. Variaveis de ambiente
### 6.1 Frontend (`frontend/.env`)
- `VITE_API_URL=/api`
- `VITE_BACKEND_TARGET=http://localhost:3001`

### 6.2 Backend (`backend/.env`)
- `PORT=3001`
- `FRONTEND_ORIGINS=http://localhost:5173,http://localhost:4173,http://localhost:3000`
- `DEMUCS_MODEL=htdemucs`
- `YTDLP_COOKIES_FILE` (opcional)
- `YTDLP_COOKIES_FROM_BROWSER` (opcional)

## 7. Execucao local
### 7.1 Setup
```bash
cd frontend && npm install
cd ../backend && npm install
```

### 7.2 Rodar backend
```bash
cd backend
npm run dev
```

### 7.3 Rodar frontend
```bash
cd frontend
npm run dev
```

### 7.4 Rodar ambos (atalho)
```bash
cd frontend
./start-all.sh
```

## 8. Observacoes operacionais
- `backend/uploads/`, `backend/stems/` e `backend/database/*.sqlite` estao no `.gitignore`.
- `backend/venv_spleeter/` esta ignorado para evitar arquivos grandes no Git.
- O projeto usa token mock para autenticacao; para producao, recomenda-se JWT e hash de senha.
