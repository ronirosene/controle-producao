require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const { db } = require('./db/sqlite');

const authRoutes = require('./routes/auth');
const servicosRoutes = require('./routes/servicos');
const produtosRoutes = require('./routes/produtos');
const { router: backupsRoutes, checkAutoBackup } = require('./routes/backups');
const usersRoutes = require('./routes/users');
const urgentesRoutes = require('./routes/urgentes');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map(s => s.trim())
    : [`http://localhost:${PORT}`, 'http://127.0.0.1:3001'],
}));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Muitas requisições. Tente novamente mais tarde.' },
});
app.use('/api/', limiter);

app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, '..', 'public')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

app.use('/api/auth', authRoutes);
app.use('/api/servicos', servicosRoutes);
app.use('/api/produtos', produtosRoutes);
app.use('/api/backups', backupsRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/urgentes', urgentesRoutes);

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Erro interno do servidor' });
});

function initDb() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);
  db.exec(`
    CREATE TABLE IF NOT EXISTS servicos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      nome TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);
  db.exec(`
    CREATE TABLE IF NOT EXISTS produtos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      servico_id INTEGER REFERENCES servicos(id) ON DELETE CASCADE,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      nome TEXT NOT NULL,
      cor TEXT DEFAULT '',
      detalhe TEXT DEFAULT '',
      observacao TEXT DEFAULT '',
      qtd_total INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);
  db.exec(`
    CREATE TABLE IF NOT EXISTS movimentacoes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      produto_id INTEGER REFERENCES produtos(id) ON DELETE CASCADE,
      setor TEXT NOT NULL CHECK (setor IN ('marcenaria', 'lixa', 'pintura', 'embalagem')),
      quantidade INTEGER DEFAULT 0,
      data_entrada TEXT,
      data_saida TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);
  try { db.exec(`ALTER TABLE movimentacoes ADD COLUMN observacao TEXT DEFAULT ''`); } catch {}
  try { db.exec(`ALTER TABLE produtos ADD COLUMN em_estoque INTEGER DEFAULT 0`); } catch {}
  try { db.exec(`ALTER TABLE servicos ADD COLUMN data_inicio TEXT`); } catch {}
  try { db.exec(`ALTER TABLE movimentacoes ADD COLUMN user_id INTEGER REFERENCES users(id)`); } catch {}
  db.exec(`
    CREATE TABLE IF NOT EXISTS backups (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      filename TEXT NOT NULL,
      filepath TEXT NOT NULL,
      size INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);
  db.exec(`
    CREATE TABLE IF NOT EXISTS produtos_urgentes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      produto_id INTEGER NOT NULL REFERENCES produtos(id) ON DELETE CASCADE,
      data_despacho TEXT NOT NULL,
      observacao TEXT DEFAULT '',
      created_by INTEGER REFERENCES users(id),
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      UNIQUE(produto_id)
    )
  `);
  console.log('Database schema initialized');
}

initDb();

app.listen(PORT, () => {
  console.log(`Controle de Produção running on http://localhost:${PORT}`);
  checkAutoBackup().catch(e => console.error('Auto-backup error:', e.message));
});
