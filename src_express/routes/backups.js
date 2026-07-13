const express = require('express');
const path = require('path');
const fs = require('fs');
const { db, query, get, transaction } = require('../db/sqlite');
const { auth } = require('../middleware/auth');

const router = express.Router();

const ADMIN_EMAILS_BACKUP = ['ronyrosene@gmail.com', 'pcp@moveispelinson.com.br'];
const MAX_BACKUPS = 20;
const BACKUP_DIR = process.env.BACKUP_DIR || (() => {
  const dbPath = process.env.DB_PATH || '';
  if (dbPath.startsWith('/data/')) {
    return '/data/backups';
  }
  return path.join(__dirname, '..', '..', 'backups');
})();

if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

async function createBackupFile() {
  const dateStr = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const filename = `backup-${dateStr}.db`;
  const filepath = path.join(BACKUP_DIR, filename);
  await db.backup(filepath);
  const stats = fs.statSync(filepath);
  return { filename, filepath, size: stats.size };
}

router.post('/create', auth, async (req, res) => {
  try {
    const user = get('SELECT email FROM users WHERE id = ?', [req.userId]);
    if (!user || !ADMIN_EMAILS_BACKUP.includes(user.email)) {
      return res.status(403).json({ error: 'Apenas administradores podem criar backups' });
    }
    const backup = await createBackupFile();
    query(
      'INSERT INTO backups (filename, filepath, size) VALUES (?, ?, ?)',
      [backup.filename, backup.filepath, backup.size]
    );
    const row = get('SELECT * FROM backups WHERE filename = ?', [backup.filename]);
    cleanOldBackups();
    res.status(201).json(row);
  } catch (err) {
    console.error('Backup create error:', err);
    res.status(500).json({ error: 'Erro ao criar backup: ' + err.message });
  }
});

router.get('/', auth, (req, res) => {
  try {
    const rows = query(
      'SELECT id, filename, size, created_at FROM backups ORDER BY created_at DESC',
      []
    );
    res.json(rows);
  } catch (err) {
    console.error('Backup list error:', err);
    res.status(500).json({ error: 'Erro ao listar backups' });
  }
});

router.post('/:id/restore', auth, (req, res) => {
  try {
    const user = get('SELECT email FROM users WHERE id = ?', [req.userId]);
    if (!user || !ADMIN_EMAILS_BACKUP.includes(user.email)) {
      return res.status(403).json({ error: 'Apenas administradores podem restaurar backups' });
    }
    const backup = get('SELECT * FROM backups WHERE id = ?', [req.params.id]);
    if (!backup) {
      return res.status(404).json({ error: 'Backup não encontrado' });
    }
    if (!fs.existsSync(backup.filepath)) {
      return res.status(404).json({ error: 'Arquivo de backup não encontrado no disco' });
    }
    const dbPath = process.env.DB_PATH || path.join(__dirname, '..', '..', 'controle.db');
    db.close();
    fs.copyFileSync(backup.filepath, path.resolve(dbPath));
    res.json({ message: 'Backup restaurado com sucesso. Reinicie o servidor.' });
  } catch (err) {
    console.error('Backup restore error:', err);
    res.status(500).json({ error: 'Erro ao restaurar backup: ' + err.message });
  }
});

router.get('/:id/download', auth, (req, res) => {
  try {
    const backup = get('SELECT * FROM backups WHERE id = ?', [req.params.id]);
    if (!backup) {
      return res.status(404).json({ error: 'Backup não encontrado' });
    }
    if (!fs.existsSync(backup.filepath)) {
      return res.status(404).json({ error: 'Arquivo de backup não encontrado no disco' });
    }
    res.download(backup.filepath, backup.filename);
  } catch (err) {
    console.error('Backup download error:', err);
    res.status(500).json({ error: 'Erro ao baixar backup' });
  }
});

router.post('/clean', auth, (req, res) => {
  try {
    const user = get('SELECT email FROM users WHERE id = ?', [req.userId]);
    if (!user || !ADMIN_EMAILS_BACKUP.includes(user.email)) {
      return res.status(403).json({ error: 'Apenas administradores podem limpar backups' });
    }
    const deleted = cleanOldBackups();
    res.json({ message: `${deleted} backup(s) antigo(s) removido(s).`, deleted });
  } catch (err) {
    console.error('Backup clean error:', err);
    res.status(500).json({ error: 'Erro ao limpar backups: ' + err.message });
  }
});

function cleanOldBackups() {
  const all = query('SELECT id, filepath FROM backups ORDER BY created_at DESC');
  if (all.length <= MAX_BACKUPS) return 0;
  const toDelete = all.slice(MAX_BACKUPS);
  let deleted = 0;
  const tx = transaction(() => {
    for (const b of toDelete) {
      try { if (fs.existsSync(b.filepath)) fs.unlinkSync(b.filepath); } catch {}
      query('DELETE FROM backups WHERE id = ?', [b.id]);
      deleted++;
    }
  });
  tx();
  return deleted;
}

async function checkAutoBackup() {
  try {
    const last = get('SELECT created_at FROM backups ORDER BY created_at DESC LIMIT 1');
    if (last) {
      const lastDate = new Date(last.created_at + 'Z');
      const diffDays = (Date.now() - lastDate.getTime()) / (1000 * 60 * 60 * 24);
      if (diffDays < 3) return;
    }
    const backup = await createBackupFile();
    query(
      'INSERT INTO backups (filename, filepath, size) VALUES (?, ?, ?)',
      [backup.filename, backup.filepath, backup.size]
    );
    cleanOldBackups();
    console.log('Auto-backup created:', backup.filename);
  } catch (err) {
    console.error('Auto-backup error:', err.message);
  }
}

module.exports = { router, checkAutoBackup, createBackupFile };
