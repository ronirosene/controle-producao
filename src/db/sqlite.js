const Database = require('better-sqlite3');
const path = require('path');

const dbPath = process.env.DB_PATH || path.join(__dirname, '..', '..', 'controle.db');
const db = new Database(dbPath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

function query(sql, params = []) {
  const stmt = db.prepare(sql);
  const trimmed = sql.trim().toUpperCase();
  if (trimmed.startsWith('SELECT') || trimmed.startsWith('WITH') || trimmed.startsWith('RETURNING')) {
    return stmt.all(...params);
  }
  if (trimmed.startsWith('INSERT') || trimmed.startsWith('UPDATE') || trimmed.startsWith('DELETE')) {
    return stmt.run(...params);
  }
  return stmt.run(...params);
}

function get(sql, params = []) {
  return db.prepare(sql).get(...params);
}

function transaction(fn) {
  return db.transaction(fn);
}

module.exports = { db, query, get, transaction };
