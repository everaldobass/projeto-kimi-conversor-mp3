const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');
const { v4: uuidv4 } = require('./uuid-polyfill');

const DB_DIR = __dirname;
const SQLITE_PATH = path.join(DB_DIR, 'database.sqlite');
const LEGACY_JSON_PATH = path.join(DB_DIR, 'database.json');
const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');
const STEMS_DIR = path.join(__dirname, '..', 'stems');

if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
if (!fs.existsSync(STEMS_DIR)) fs.mkdirSync(STEMS_DIR, { recursive: true });

const db = new DatabaseSync(SQLITE_PATH);

function initializeSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      nome TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      senha TEXT NOT NULL,
      perfil TEXT NOT NULL,
      ativo INTEGER NOT NULL DEFAULT 1,
      dataCadastro TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS songs (
      id TEXT PRIMARY KEY,
      titulo TEXT NOT NULL,
      artista TEXT NOT NULL,
      genero TEXT NOT NULL,
      duracao TEXT NOT NULL,
      bpm INTEGER,
      tom TEXT,
      caminhoArquivo TEXT NOT NULL,
      thumbnail TEXT,
      usuarioId TEXT NOT NULL,
      historyId TEXT,
      favorito INTEGER NOT NULL DEFAULT 0,
      dataUpload TEXT NOT NULL,
      FOREIGN KEY (usuarioId) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS stems (
      id TEXT PRIMARY KEY,
      musicaId TEXT NOT NULL,
      tipo TEXT NOT NULL,
      caminhoArquivo TEXT NOT NULL,
      volume INTEGER NOT NULL DEFAULT 100,
      dataCriacao TEXT NOT NULL,
      FOREIGN KEY (musicaId) REFERENCES songs(id)
    );

    CREATE TABLE IF NOT EXISTS history (
      id TEXT PRIMARY KEY,
      url TEXT NOT NULL,
      status TEXT NOT NULL,
      mensagemErro TEXT,
      dataInicio TEXT NOT NULL,
      dataFim TEXT,
      usuarioId TEXT NOT NULL,
      titulo TEXT,
      thumbnail TEXT,
      artista TEXT,
      duracao TEXT,
      FOREIGN KEY (usuarioId) REFERENCES users(id)
    );

    CREATE INDEX IF NOT EXISTS idx_songs_usuario ON songs(usuarioId);
    CREATE INDEX IF NOT EXISTS idx_stems_musica ON stems(musicaId);
    CREATE INDEX IF NOT EXISTS idx_history_usuario ON history(usuarioId);
  `);
}

function ensureColumn(tableName, columnName, definition) {
  const columns = db.prepare(`PRAGMA table_info(${tableName})`).all();
  const hasColumn = columns.some((column) => column.name === columnName);
  if (!hasColumn) {
    db.exec(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition}`);
  }
}

function toBool(value) {
  return value === 1 || value === true;
}

function mapUser(row) {
  if (!row) return null;
  return {
    ...row,
    ativo: toBool(row.ativo),
  };
}

function mapSong(row) {
  if (!row) return null;
  return {
    ...row,
    favorito: toBool(row.favorito),
  };
}

function mapStem(row) {
  if (!row) return null;
  return {
    ...row,
    volume: Number(row.volume),
  };
}

function mapHistory(row) {
  if (!row) return null;
  return row;
}

function migrateLegacyJsonIfNeeded() {
  const usersCount = db.prepare('SELECT COUNT(*) as c FROM users').get().c;
  if (usersCount > 0) return;
  if (!fs.existsSync(LEGACY_JSON_PATH)) return;

  try {
    const legacy = JSON.parse(fs.readFileSync(LEGACY_JSON_PATH, 'utf8'));

    const insertUser = db.prepare(`
      INSERT OR IGNORE INTO users (id, nome, email, senha, perfil, ativo, dataCadastro)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    const insertSong = db.prepare(`
      INSERT OR IGNORE INTO songs
      (id, titulo, artista, genero, duracao, bpm, tom, caminhoArquivo, thumbnail, usuarioId, historyId, favorito, dataUpload)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const insertStem = db.prepare(`
      INSERT OR IGNORE INTO stems (id, musicaId, tipo, caminhoArquivo, volume, dataCriacao)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    const insertHistory = db.prepare(`
      INSERT OR IGNORE INTO history
      (id, url, status, mensagemErro, dataInicio, dataFim, usuarioId, titulo, thumbnail, artista, duracao)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const user of legacy.users || []) {
      insertUser.run(
        user.id,
        user.nome,
        user.email,
        user.senha,
        user.perfil || 'USER',
        user.ativo ? 1 : 0,
        user.dataCadastro || new Date().toISOString()
      );
    }

    for (const song of legacy.songs || []) {
      insertSong.run(
        song.id,
        song.titulo,
        song.artista || 'Artista Desconhecido',
        song.genero || 'Pop',
        song.duracao || '0:00',
        song.bpm ?? null,
        song.tom ?? null,
        song.caminhoArquivo,
        song.thumbnail || null,
        song.usuarioId,
        song.historyId || null,
        song.favorito ? 1 : 0,
        song.dataUpload || new Date().toISOString()
      );
    }

    for (const stem of legacy.stems || []) {
      insertStem.run(
        stem.id,
        stem.musicaId,
        stem.tipo,
        stem.caminhoArquivo,
        Number.isFinite(stem.volume) ? stem.volume : 100,
        stem.dataCriacao || new Date().toISOString()
      );
    }

    for (const item of legacy.history || []) {
      insertHistory.run(
        item.id,
        item.url,
        item.status,
        item.mensagemErro || null,
        item.dataInicio || new Date().toISOString(),
        item.dataFim || null,
        item.usuarioId,
        item.titulo || null,
        item.thumbnail || null,
        item.artista || null,
        item.duracao || null
      );
    }

    console.log('Migração do database.json para SQLite concluída.');
  } catch (error) {
    console.error('Falha ao migrar database.json para SQLite:', error);
  }
}

initializeSchema();
ensureColumn('songs', 'bpm', 'INTEGER');
ensureColumn('songs', 'tom', 'TEXT');
migrateLegacyJsonIfNeeded();

const users = {
  create: (userData) => {
    const user = {
      id: uuidv4(),
      ...userData,
      ativo: true,
      dataCadastro: new Date().toISOString(),
    };

    db.prepare(`
      INSERT INTO users (id, nome, email, senha, perfil, ativo, dataCadastro)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      user.id,
      user.nome,
      user.email,
      user.senha,
      user.perfil,
      1,
      user.dataCadastro
    );

    return user;
  },

  findByEmail: (email) => mapUser(db.prepare('SELECT * FROM users WHERE email = ?').get(email)),

  findById: (id) => mapUser(db.prepare('SELECT * FROM users WHERE id = ?').get(id)),

  validatePassword: (user, password) => user.senha === password,
};

const songs = {
  create: (songData) => {
    const song = {
      id: uuidv4(),
      ...songData,
      favorito: false,
      dataUpload: new Date().toISOString(),
    };

    db.prepare(`
      INSERT INTO songs
      (id, titulo, artista, genero, duracao, bpm, tom, caminhoArquivo, thumbnail, usuarioId, historyId, favorito, dataUpload)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      song.id,
      song.titulo,
      song.artista,
      song.genero,
      song.duracao,
      song.bpm ?? null,
      song.tom ?? null,
      song.caminhoArquivo,
      song.thumbnail || null,
      song.usuarioId,
      song.historyId || null,
      0,
      song.dataUpload
    );

    return song;
  },

  findAll: (usuarioId) => {
    const rows = db
      .prepare('SELECT * FROM songs WHERE usuarioId = ? ORDER BY dataUpload DESC')
      .all(usuarioId);
    return rows.map(mapSong);
  },

  findById: (id) => mapSong(db.prepare('SELECT * FROM songs WHERE id = ?').get(id)),

  toggleFavorite: (id) => {
    const song = songs.findById(id);
    if (!song) return null;

    const nextFavorito = song.favorito ? 0 : 1;
    db.prepare('UPDATE songs SET favorito = ? WHERE id = ?').run(nextFavorito, id);

    return songs.findById(id);
  },

  delete: (id) => {
    const song = songs.findById(id);
    if (!song) return false;

    if (song.caminhoArquivo) {
      const filePath = path.join(__dirname, '..', song.caminhoArquivo.replace(/^\//, ''));
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }

    db.prepare('DELETE FROM songs WHERE id = ?').run(id);
    return true;
  },
};

const stems = {
  create: (stemData) => {
    const stem = {
      id: uuidv4(),
      ...stemData,
      dataCriacao: new Date().toISOString(),
    };

    db.prepare(`
      INSERT INTO stems (id, musicaId, tipo, caminhoArquivo, volume, dataCriacao)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      stem.id,
      stem.musicaId,
      stem.tipo,
      stem.caminhoArquivo,
      stem.volume,
      stem.dataCriacao
    );

    return stem;
  },

  findBySongId: (musicaId) => {
    const rows = db.prepare('SELECT * FROM stems WHERE musicaId = ?').all(musicaId);
    return rows.map(mapStem);
  },

  findById: (id) => mapStem(db.prepare('SELECT * FROM stems WHERE id = ?').get(id)),

  updateVolume: (id, volume) => {
    const safeVolume = Math.max(0, Math.min(100, Number(volume) || 0));
    db.prepare('UPDATE stems SET volume = ? WHERE id = ?').run(safeVolume, id);
    return stems.findById(id);
  },

  deleteBySongId: (musicaId) => {
    const stemsToDelete = stems.findBySongId(musicaId);
    for (const stem of stemsToDelete) {
      if (!stem.caminhoArquivo) continue;
      const filePath = path.join(__dirname, '..', stem.caminhoArquivo.replace(/^\//, ''));
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }

    db.prepare('DELETE FROM stems WHERE musicaId = ?').run(musicaId);
  },
};

const history = {
  create: (historyData) => {
    const item = {
      id: uuidv4(),
      ...historyData,
      dataInicio: new Date().toISOString(),
    };

    db.prepare(`
      INSERT INTO history
      (id, url, status, mensagemErro, dataInicio, dataFim, usuarioId, titulo, thumbnail, artista, duracao)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      item.id,
      item.url,
      item.status,
      item.mensagemErro || null,
      item.dataInicio,
      item.dataFim || null,
      item.usuarioId,
      item.titulo || null,
      item.thumbnail || null,
      item.artista || null,
      item.duracao || null
    );

    return item;
  },

  findAll: (usuarioId) => {
    const rows = db
      .prepare('SELECT * FROM history WHERE usuarioId = ? ORDER BY dataInicio DESC')
      .all(usuarioId);
    return rows.map(mapHistory);
  },

  findById: (id) => mapHistory(db.prepare('SELECT * FROM history WHERE id = ?').get(id)),

  updateDetails: (id, details) => {
    const current = history.findById(id);
    if (!current) return null;

    const updated = {
      ...current,
      ...details,
    };

    db.prepare(`
      UPDATE history
      SET titulo = ?, thumbnail = ?, artista = ?, duracao = ?
      WHERE id = ?
    `).run(
      updated.titulo || null,
      updated.thumbnail || null,
      updated.artista || null,
      updated.duracao || null,
      id
    );

    return history.findById(id);
  },

  updateStatus: (id, status, mensagemErro = null) => {
    const dataFim = status === 'DONE' || status === 'ERROR' ? new Date().toISOString() : null;

    db.prepare(`
      UPDATE history
      SET status = ?, mensagemErro = ?, dataFim = COALESCE(?, dataFim)
      WHERE id = ?
    `).run(status, mensagemErro, dataFim, id);

    return history.findById(id);
  },

  delete: (id) => {
    const row = db.prepare('DELETE FROM history WHERE id = ?').run(id);
    return row.changes > 0;
  },
};

function parseDurationToSeconds(duration) {
  if (!duration || typeof duration !== 'string') return 0;

  const parts = duration.split(':').map((value) => Number(value));
  if (parts.some((value) => Number.isNaN(value))) return 0;

  if (parts.length === 2) {
    const [minutes, seconds] = parts;
    return minutes * 60 + seconds;
  }

  if (parts.length === 3) {
    const [hours, minutes, seconds] = parts;
    return hours * 3600 + minutes * 60 + seconds;
  }

  return 0;
}

const stats = {
  getUserStats: (usuarioId) => {
    const userSongs = songs.findAll(usuarioId);
    const userHistory = history.findAll(usuarioId);

    return {
      totalSongs: userSongs.length,
      favorites: userSongs.filter((s) => s.favorito).length,
      conversions: userHistory.length,
      totalDuration: userSongs.reduce((acc, s) => acc + parseDurationToSeconds(s.duracao), 0),
    };
  },
};

module.exports = {
  users,
  songs,
  stems,
  history,
  stats,
  UPLOADS_DIR,
  STEMS_DIR,
  SQLITE_PATH,
};
