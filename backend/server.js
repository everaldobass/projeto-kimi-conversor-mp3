const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs');
const { spawnSync } = require('child_process');

const { 
  users, 
  songs, 
  stems, 
  history, 
  stats, 
  UPLOADS_DIR, 
  STEMS_DIR 
} = require('./database/db');

const app = express();
const PORT = process.env.PORT || 3001;
const DEMUCS_MODEL = process.env.DEMUCS_MODEL || 'htdemucs';
const VENV_PYTHON_PATH = path.join(__dirname, 'venv_spleeter', 'bin', 'python');
const PYTHON_CMD = fs.existsSync(VENV_PYTHON_PATH) ? VENV_PYTHON_PATH : 'python3';
const FRONTEND_ORIGINS = (process.env.FRONTEND_ORIGINS || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);
const YTDLP_COOKIES_FILE_RAW = process.env.YTDLP_COOKIES_FILE || '';
const YTDLP_COOKIES_FROM_BROWSER_RAW = process.env.YTDLP_COOKIES_FROM_BROWSER || '';
const YTDLP_COOKIES_FROM_BROWSER = YTDLP_COOKIES_FROM_BROWSER_RAW
  .replace(/^browser[-:]/i, '')
  .trim();

function resolveCookiesFilePath() {
  if (YTDLP_COOKIES_FILE_RAW) {
    return fs.existsSync(YTDLP_COOKIES_FILE_RAW) ? YTDLP_COOKIES_FILE_RAW : '';
  }

  const home = process.env.HOME || '';
  const candidates = [
    path.join(home, 'Downloads', 'youtube_cookies.txt'),
    path.join(home, 'Downloads', 'cookies.txt'),
  ];

  const existing = candidates.find((candidate) => fs.existsSync(candidate));
  return existing || '';
}

const YTDLP_COOKIES_FILE = resolveCookiesFilePath();

// Middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));
app.use(cors({
  origin: (origin, callback) => {
    const defaultOrigins = ['http://localhost:5173', 'http://localhost:4173', 'http://localhost:3000'];
    const allowedOrigins = FRONTEND_ORIGINS.length > 0 ? FRONTEND_ORIGINS : defaultOrigins;

    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }

    callback(new Error('Origem não permitida pelo CORS'));
  },
  credentials: true
}));
app.use(morgan('dev'));
app.use(express.json());

// Servir arquivos estáticos
app.use('/uploads', express.static(UPLOADS_DIR));
app.use('/stems', express.static(STEMS_DIR));

// ===== AUTH MIDDLEWARE =====
const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const tokenFromHeader = authHeader?.startsWith('Bearer ')
    ? authHeader.replace('Bearer ', '')
    : null;
  const token = tokenFromHeader || req.query.token;
  
  if (!token) {
    return res.status(401).json({ error: 'Token não fornecido' });
  }
  
  // Simulação de validação de token
  const userId = token.replace('mock-token-', '');
  const user = users.findById(userId);
  
  if (!user) {
    return res.status(401).json({ error: 'Token inválido' });
  }
  
  req.user = user;
  next();
};

// ===== AUTH ROUTES =====
app.post('/api/auth/register', (req, res) => {
  try {
    const { nome, email, senha } = req.body;
    
    if (!nome || !email || !senha) {
      return res.status(400).json({ error: 'Dados incompletos' });
    }
    
    // Verificar se email já existe
    const existingUser = users.findByEmail(email);
    if (existingUser) {
      return res.status(400).json({ error: 'Email já cadastrado' });
    }
    
    // Criar usuário
    const user = users.create({
      nome,
      email,
      senha, // Em produção: bcrypt.hashSync(senha, 10)
      perfil: 'USER'
    });
    
    const token = `mock-token-${user.id}`;
    
    res.json({
      user: {
        id: user.id,
        nome: user.nome,
        email: user.email,
        perfil: user.perfil,
        ativo: user.ativo
      },
      token
    });
  } catch (error) {
    console.error('Erro no registro:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

app.post('/api/auth/login', (req, res) => {
  try {
    const { email, senha } = req.body;
    
    const user = users.findByEmail(email);
    if (!user) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }
    
    // Em produção: bcrypt.compareSync(senha, user.senha)
    if (user.senha !== senha) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }
    
    const token = `mock-token-${user.id}`;
    
    res.json({
      user: {
        id: user.id,
        nome: user.nome,
        email: user.email,
        perfil: user.perfil,
        ativo: user.ativo
      },
      token
    });
  } catch (error) {
    console.error('Erro no login:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// ===== SONGS ROUTES =====
app.get('/api/songs', authMiddleware, (req, res) => {
  try {
    const userSongs = songs.findAll(req.user.id);
    res.json(userSongs);
  } catch (error) {
    console.error('Erro ao buscar músicas:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

app.get('/api/songs/:id', authMiddleware, (req, res) => {
  try {
    const song = songs.findById(req.params.id);
    if (!song || song.usuarioId !== req.user.id) {
      return res.status(404).json({ error: 'Música não encontrada' });
    }
    
    // Buscar stems da música
    const songStems = stems.findBySongId(song.id);
    
    res.json({ ...song, stems: songStems });
  } catch (error) {
    console.error('Erro ao buscar música:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

app.post('/api/songs/:id/favorite', authMiddleware, (req, res) => {
  try {
    const song = songs.toggleFavorite(req.params.id);
    if (!song) {
      return res.status(404).json({ error: 'Música não encontrada' });
    }
    res.json(song);
  } catch (error) {
    console.error('Erro ao favoritar:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

app.delete('/api/songs/:id', authMiddleware, (req, res) => {
  try {
    const song = songs.findById(req.params.id);
    if (!song || song.usuarioId !== req.user.id) {
      return res.status(404).json({ error: 'Música não encontrada' });
    }
    
    // Remover stems associados
    stems.deleteBySongId(req.params.id);
    
    // Remover música
    songs.delete(req.params.id);
    
    res.json({ message: 'Música removida com sucesso' });
  } catch (error) {
    console.error('Erro ao remover música:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// ===== CONVERT ROUTES =====
app.post('/api/convert', authMiddleware, async (req, res) => {
  try {
    const { url, enableStems } = req.body;
    
    if (!url) {
      return res.status(400).json({ error: 'URL não fornecida' });
    }
    
    // Criar registro no histórico
    const historyItem = history.create({
      url,
      status: 'PENDING',
      usuarioId: req.user.id
    });
    
    // Responder imediatamente com o ID do processo
    res.json({ 
      id: historyItem.id,
      status: 'PENDING',
      message: 'Conversão iniciada'
    });
    
    // Iniciar processo de conversão em background
    processConversion(historyItem.id, url, req.user.id, enableStems);
    
  } catch (error) {
    console.error('Erro na conversão:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Função para processar conversão
async function processConversion(historyId, url, userId, enableStems) {
  try {
    // Atualizar status para PROCESSING
    history.updateStatus(historyId, 'PROCESSING');

    // Extrair informações reais do vídeo
    const videoInfo = await extractVideoInfo(url);
    
    // Atualizar histórico com informações do vídeo
    history.updateDetails(historyId, {
      titulo: videoInfo.titulo,
      thumbnail: videoInfo.thumbnail,
      artista: videoInfo.artista,
      duracao: videoInfo.duracao,
    });
    
    // Criar arquivo MP3 real
    const createdSong = await createMP3File(historyId, videoInfo, userId, url);
    
    // Se solicitado, criar stems
    if (enableStems) {
      await createStems(createdSong);
    }
    
    // Atualizar status para DONE
    history.updateStatus(historyId, 'DONE');
    
    console.log(`Conversão ${historyId} concluída com sucesso`);
    
  } catch (error) {
    console.error('Erro no processamento:', error);
    history.updateStatus(historyId, 'ERROR', error.message);
  }
}

function secondsToDuration(totalSeconds) {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds || 0));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const seconds = safeSeconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds
      .toString()
      .padStart(2, '0')}`;
  }

  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function normalizeSongKey(raw) {
  if (!raw || typeof raw !== 'string') return null;
  const trimmed = raw.trim().toUpperCase();
  return trimmed.length > 0 ? trimmed : null;
}

function detectSongKeyFromText(text) {
  if (!text || typeof text !== 'string') return null;
  const match = text.match(/\b([A-G](?:#|B)?M?)\b/i);
  if (!match) return null;
  return normalizeSongKey(match[1]);
}

function runCommand(command, args) {
  const result = spawnSync(command, args, { encoding: 'utf8' });
  if (result.status !== 0) {
    const stderr = (result.stderr || '').trim();
    throw new Error(stderr || `Falha ao executar ${command}`);
  }
  return result.stdout || '';
}

function runCommandWithResult(command, args) {
  const result = spawnSync(command, args, { encoding: 'utf8' });
  return {
    ok: result.status === 0,
    stdout: result.stdout || '',
    stderr: result.stderr || '',
    status: result.status,
  };
}

function commandAvailable(command, args = ['--help']) {
  const result = spawnSync(command, args, { encoding: 'utf8' });
  return result.status === 0 || result.status === 1;
}

function supportsImpersonateChrome() {
  const result = runCommandWithResult('yt-dlp', ['--list-impersonate-targets']);
  if (!result.ok) return false;
  const output = `${result.stdout}\n${result.stderr}`.toLowerCase();
  return output.includes('chrome');
}

function buildYtDlpBaseArgs() {
  return [
    '--no-warnings',
    '--no-playlist',
  ];
}

function runYtDlpWithFallback(operationArgs) {
  const attempts = [];
  const dedupe = new Set();
  const cookieStrategies = [[]];
  const impersonateStrategies = supportsImpersonateChrome()
    ? [[], ['--impersonate', 'chrome']]
    : [[]];
  const clientStrategies = [
    [],
    ['--extractor-args', 'youtube:player_client=web'],
    ['--extractor-args', 'youtube:player_client=ios,web'],
    ['--extractor-args', 'youtube:player_client=tv,web'],
  ];

  if (YTDLP_COOKIES_FROM_BROWSER) {
    cookieStrategies.push(['--cookies-from-browser', YTDLP_COOKIES_FROM_BROWSER]);
  }

  if (YTDLP_COOKIES_FILE && fs.existsSync(YTDLP_COOKIES_FILE)) {
    cookieStrategies.push(['--cookies', YTDLP_COOKIES_FILE]);
  }

  for (const cookieArgs of cookieStrategies) {
    for (const impersonateArgs of impersonateStrategies) {
      for (const clientArgs of clientStrategies) {
        const args = [
          ...buildYtDlpBaseArgs(),
          ...cookieArgs,
          ...impersonateArgs,
          ...clientArgs,
          ...operationArgs,
        ];

        const key = args.join('\u0001');
        if (!dedupe.has(key)) {
          dedupe.add(key);
          attempts.push(args);
        }
      }
    }
  }

  let lastError = '';
  const errors = [];
  let hasImpersonateUnavailableError = false;

  for (const args of attempts) {
    const result = runCommandWithResult('yt-dlp', args);
    if (result.ok) return result.stdout || '';
    lastError = result.stderr || 'Falha ao executar yt-dlp';
    errors.push(lastError);
    if (/Impersonate target .* is not available/i.test(lastError)) {
      hasImpersonateUnavailableError = true;
    }
  }

  // Se o yt-dlp não suportar impersonate nesta instalação, repetir sem impersonate.
  if (hasImpersonateUnavailableError) {
    const attemptsWithoutImpersonate = attempts.filter(
      (args) => !args.includes('--impersonate')
    );
    for (const args of attemptsWithoutImpersonate) {
      const result = runCommandWithResult('yt-dlp', args);
      if (result.ok) return result.stdout || '';
      lastError = result.stderr || 'Falha ao executar yt-dlp';
      errors.push(lastError);
    }
  }

  const allErrors = errors.join('\n');
  const hasSecretStorageError = /secretstorage not available/i.test(allErrors);
  const hasCookieDbError = /could not find .* cookies database/i.test(allErrors);
  const hasAntiBotError = /Sign in to confirm you're not a bot/i.test(allErrors);
  const hasYoutubePrecondition = /Precondition check failed|not available on this app/i.test(allErrors);

  if (hasAntiBotError && hasSecretStorageError) {
    throw new Error(
      "YouTube exigiu login e a leitura de cookies do navegador falhou (secretstorage). Instale no mesmo Python do yt-dlp: python3 -m pip install secretstorage keyring, ou use YTDLP_COOKIES_FILE com cookies.txt."
    );
  }

  if (hasAntiBotError) {
    throw new Error(
      'YouTube bloqueou a requisição. Atualize/regere o cookies.txt e tente novamente. O backend já tentou automaticamente cookies, impersonate=chrome e player_client alternativos.'
    );
  }

  if (hasSecretStorageError) {
    throw new Error(
      'Não foi possível ler cookies do navegador. Instale no mesmo Python do yt-dlp: python3 -m pip install secretstorage keyring, ou use YTDLP_COOKIES_FILE com cookies.txt.'
    );
  }

  if (hasCookieDbError) {
    throw new Error(
      'Cookies do navegador não encontrados para o usuário atual. Execute o backend sem sudo (seu usuário normal) ou configure YTDLP_COOKIES_FILE com um cookies.txt válido.'
    );
  }

  if (hasYoutubePrecondition) {
    throw new Error(
      'YouTube recusou o client padrão para este vídeo. Atualize o yt-dlp e gere cookies.txt novo; o backend já tentou clients alternativos automaticamente.'
    );
  }

  throw new Error(lastError.trim() || 'Falha ao executar yt-dlp');
}

// Extrair informações do vídeo com yt-dlp
async function extractVideoInfo(url) {
  const output = runYtDlpWithFallback(['--dump-single-json', url]);
  const info = JSON.parse(output);

  const rawTitle = info.track || info.title || 'Música Convertida';
  const rawArtist =
    info.artist ||
    info.uploader ||
    info.channel ||
    info.creator ||
    'Artista Desconhecido';
  const rawKey = info.music_key || info.key || detectSongKeyFromText(rawTitle);

  return {
    titulo: rawTitle,
    artista: rawArtist,
    thumbnail: info.thumbnail || `https://picsum.photos/300/300?random=${Date.now()}`,
    duracao: secondsToDuration(info.duration || 0),
    genero: info.genre || 'Pop',
    tom: normalizeSongKey(rawKey),
  };
}

// Criar arquivo de áudio
async function createMP3File(historyId, videoInfo, userId, url) {
  const songId = require('./database/uuid-polyfill').v4();
  const outputTemplate = path.join(UPLOADS_DIR, `${songId}.%(ext)s`);

  runYtDlpWithFallback([
    '--extract-audio',
    '--audio-format',
    'mp3',
    '--audio-quality',
    '0',
    '-o',
    outputTemplate,
    url,
  ]);

  const filename = `${songId}.mp3`;
  const filepath = path.join(UPLOADS_DIR, filename);
  if (!fs.existsSync(filepath)) {
    throw new Error('yt-dlp não gerou o arquivo MP3 esperado');
  }
  
  // Criar registro da música
  const song = songs.create({
    titulo: videoInfo.titulo,
    artista: videoInfo.artista,
    genero: videoInfo.genero,
    duracao: videoInfo.duracao,
    tom: videoInfo.tom || null,
    caminhoArquivo: `/uploads/${filename}`,
    thumbnail: videoInfo.thumbnail,
    usuarioId: userId,
    historyId
  });
  
  return song;
}

function convertAudioToMp3(inputPath, outputPath) {
  runCommand('ffmpeg', [
    '-y',
    '-i',
    inputPath,
    '-codec:a',
    'libmp3lame',
    '-q:a',
    '2',
    outputPath,
  ]);
}

function tryDemucs(sourcePath, tempOutputDir) {
  const args = [
    '-m',
    'demucs',
    '--mp3',
    '--out',
    tempOutputDir,
    '--name',
    DEMUCS_MODEL,
    sourcePath,
  ];

  const result = runCommandWithResult(PYTHON_CMD, args);
  if (!result.ok) return null;

  const trackName = path.parse(sourcePath).name;
  const baseDir = path.join(tempOutputDir, DEMUCS_MODEL, trackName);
  return {
    VOCAL: path.join(baseDir, 'vocals.mp3'),
    BATERIA: path.join(baseDir, 'drums.mp3'),
    BAIXO: path.join(baseDir, 'bass.mp3'),
    OUTRO: path.join(baseDir, 'other.mp3'),
  };
}

function trySpleeter(sourcePath, tempOutputDir) {
  const args = [
    '-m',
    'spleeter',
    'separate',
    '-p',
    'spleeter:4stems',
    '-o',
    tempOutputDir,
    sourcePath,
  ];

  const result = runCommandWithResult(PYTHON_CMD, args);
  if (!result.ok) return null;

  const trackName = path.parse(sourcePath).name;
  const baseDir = path.join(tempOutputDir, trackName);
  return {
    VOCAL: path.join(baseDir, 'vocals.wav'),
    BATERIA: path.join(baseDir, 'drums.wav'),
    BAIXO: path.join(baseDir, 'bass.wav'),
    OUTRO: path.join(baseDir, 'other.wav'),
  };
}

function getAvailableSeparationEngine() {
  const hasPython = commandAvailable(PYTHON_CMD, ['--version']);
  if (!hasPython) return null;

  if (runCommandWithResult(PYTHON_CMD, ['-m', 'demucs', '--help']).ok) {
    return 'demucs';
  }

  if (runCommandWithResult(PYTHON_CMD, ['-m', 'spleeter', 'separate', '-h']).ok) {
    return 'spleeter';
  }

  return null;
}

// Criar stems com separação real (Demucs ou Spleeter)
async function createStems(song) {
  const sourcePath = path.join(__dirname, song.caminhoArquivo.replace(/^\//, ''));
  if (!fs.existsSync(sourcePath)) {
    throw new Error('Áudio principal não encontrado para gerar stems');
  }

  const availableEngine = getAvailableSeparationEngine();
  if (!availableEngine) {
    throw new Error(
      'Separação real indisponível. Instale Demucs (python3 -m pip install demucs) ou Spleeter (python3 -m pip install spleeter).'
    );
  }

  const tempOutputDir = path.join(STEMS_DIR, '.tmp', `${song.id}-${Date.now()}`);
  fs.mkdirSync(tempOutputDir, { recursive: true });

  stems.deleteBySongId(song.id);

  let stemSources;
  try {
    stemSources =
      availableEngine === 'demucs'
        ? tryDemucs(sourcePath, tempOutputDir)
        : trySpleeter(sourcePath, tempOutputDir);

    if (!stemSources) {
      throw new Error(`Falha ao separar stems com ${availableEngine}`);
    }

    const stemMap = [
      { tipo: 'VOCAL', source: stemSources.VOCAL },
      { tipo: 'BATERIA', source: stemSources.BATERIA },
      { tipo: 'BAIXO', source: stemSources.BAIXO },
      { tipo: 'OUTRO', source: stemSources.OUTRO },
    ];

    for (const stemItem of stemMap) {
      if (!fs.existsSync(stemItem.source)) {
        throw new Error(`Stem não encontrado após separação: ${stemItem.tipo}`);
      }

      const filename = `${song.id}_${stemItem.tipo.toLowerCase()}.mp3`;
      const targetPath = path.join(STEMS_DIR, filename);

      if (stemItem.source.toLowerCase().endsWith('.mp3')) {
        fs.copyFileSync(stemItem.source, targetPath);
      } else {
        convertAudioToMp3(stemItem.source, targetPath);
      }

      stems.create({
        musicaId: song.id,
        tipo: stemItem.tipo,
        caminhoArquivo: `/stems/${filename}`,
        volume: 100,
      });
    }
  } finally {
    fs.rmSync(tempOutputDir, { recursive: true, force: true });
  }
}

// ===== STEMS ROUTES =====
app.get('/api/songs/:id/stems', authMiddleware, (req, res) => {
  try {
    const song = songs.findById(req.params.id);
    if (!song || song.usuarioId !== req.user.id) {
      return res.status(404).json({ error: 'Música não encontrada' });
    }
    
    const songStems = stems.findBySongId(req.params.id);
    res.json(songStems);
  } catch (error) {
    console.error('Erro ao buscar stems:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

app.patch('/api/stems/:id/volume', authMiddleware, (req, res) => {
  try {
    const { volume } = req.body;
    const stem = stems.findById(req.params.id);
    
    if (!stem) {
      return res.status(404).json({ error: 'Stem não encontrado' });
    }
    
    // Verificar se o usuário é dono da música
    const song = songs.findById(stem.musicaId);
    if (!song || song.usuarioId !== req.user.id) {
      return res.status(403).json({ error: 'Acesso negado' });
    }
    
    const updatedStem = stems.updateVolume(req.params.id, volume);
    res.json(updatedStem);
  } catch (error) {
    console.error('Erro ao atualizar volume:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// ===== HISTORY ROUTES =====
app.get('/api/history', authMiddleware, (req, res) => {
  try {
    const userHistory = history.findAll(req.user.id);
    res.json(userHistory);
  } catch (error) {
    console.error('Erro ao buscar histórico:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

app.get('/api/history/:id/status', authMiddleware, (req, res) => {
  try {
    const userHistory = history.findAll(req.user.id);
    const item = userHistory.find(h => h.id === req.params.id);
    
    if (!item) {
      return res.status(404).json({ error: 'Histórico não encontrado' });
    }
    
    res.json(item);
  } catch (error) {
    console.error('Erro ao buscar status:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

app.delete('/api/history/:id', authMiddleware, (req, res) => {
  try {
    const userHistory = history.findAll(req.user.id);
    const item = userHistory.find(h => h.id === req.params.id);
    
    if (!item) {
      return res.status(404).json({ error: 'Histórico não encontrado' });
    }
    
    history.delete(req.params.id);
    res.json({ message: 'Item removido com sucesso' });
  } catch (error) {
    console.error('Erro ao remover histórico:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// ===== STATS ROUTES =====
app.get('/api/stats', authMiddleware, (req, res) => {
  try {
    const userStats = stats.getUserStats(req.user.id);
    res.json(userStats);
  } catch (error) {
    console.error('Erro ao buscar estatísticas:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// ===== DOWNLOAD ROUTES =====
app.get('/api/download/:id', authMiddleware, (req, res) => {
  try {
    const song = songs.findById(req.params.id);
    if (!song || song.usuarioId !== req.user.id) {
      return res.status(404).json({ error: 'Música não encontrada' });
    }
    
    const filepath = path.join(__dirname, song.caminhoArquivo.replace('/uploads/', 'uploads/'));
    
    if (!fs.existsSync(filepath)) {
      return res.status(404).json({ error: 'Arquivo não encontrado' });
    }
    
    const ext = path.extname(filepath) || '.wav';
    res.download(filepath, `${song.titulo}${ext}`);
  } catch (error) {
    console.error('Erro no download:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// ===== HEALTH CHECK =====
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Iniciar servidor
app.listen(PORT, () => {
  const separationEngine = getAvailableSeparationEngine();
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
  console.log(`📁 Uploads: ${UPLOADS_DIR}`);
  console.log(`🎵 Stems: ${STEMS_DIR}`);
  console.log(
    `🎚️ Separação de stems: ${separationEngine ? separationEngine.toUpperCase() : 'indisponível'}`
  );
  console.log(
    `🍪 yt-dlp cookies: ${
      YTDLP_COOKIES_FROM_BROWSER
        ? `browser=${YTDLP_COOKIES_FROM_BROWSER}`
        : YTDLP_COOKIES_FILE
        ? `file=${YTDLP_COOKIES_FILE}`
        : 'não configurado'
    }`
  );
  if (YTDLP_COOKIES_FILE_RAW && !YTDLP_COOKIES_FILE) {
    console.log(`⚠️ Arquivo de cookies não encontrado: ${YTDLP_COOKIES_FILE_RAW}`);
  }
});

module.exports = app;
