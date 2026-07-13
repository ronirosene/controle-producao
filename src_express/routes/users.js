const express = require('express');
const bcrypt = require('bcryptjs');
const { query, get } = require('../db/sqlite');
const { auth } = require('../middleware/auth');

const router = express.Router();

const ADMIN_EMAILS_USERS = ['ronyrosene@gmail.com'];

function isAdminUser(req) {
  const user = get('SELECT email FROM users WHERE id = ?', [req.userId]);
  return user && ADMIN_EMAILS_USERS.includes(user.email);
}

router.get('/', auth, (req, res) => {
  try {
    if (!isAdminUser(req)) return res.status(403).json({ error: 'Apenas administradores' });
    const users = query(
      'SELECT id, name, email, created_at FROM users ORDER BY name ASC',
      []
    );
    res.json(users);
  } catch (err) {
    console.error('List users error:', err);
    res.status(500).json({ error: 'Erro ao listar usuários' });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    if (!isAdminUser(req)) return res.status(403).json({ error: 'Apenas administradores' });
    const { name, email, password } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: 'Nome, email e senha obrigatórios' });
    const existing = get('SELECT id FROM users WHERE email = ?', [email]);
    if (existing) return res.status(409).json({ error: 'Email já cadastrado' });
    const password_hash = await bcrypt.hash(password, 12);
    const result = query(
      'INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)',
      [name.trim(), email.trim().toLowerCase(), password_hash]
    );
    const user = get('SELECT id, name, email, created_at FROM users WHERE id = ?', [result.lastInsertRowid]);
    res.status(201).json(user);
  } catch (err) {
    console.error('Create user error:', err);
    res.status(500).json({ error: 'Erro ao criar usuário' });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    if (!isAdminUser(req)) return res.status(403).json({ error: 'Apenas administradores' });
    const { name, email, password } = req.body;
    const userId = Number(req.params.id);
    const user = get('SELECT id FROM users WHERE id = ?', [userId]);
    if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });
    const updates = [];
    const values = [];
    if (name !== undefined && name.trim()) { updates.push('name = ?'); values.push(name.trim()); }
    if (email !== undefined && email.trim()) { updates.push('email = ?'); values.push(email.trim().toLowerCase()); }
    if (password !== undefined && password) {
      const password_hash = await bcrypt.hash(password, 12);
      updates.push('password_hash = ?');
      values.push(password_hash);
    }
    if (updates.length === 0) return res.status(400).json({ error: 'Nenhum campo para atualizar' });
    updates.push("updated_at = datetime('now')");
    values.push(userId);
    query(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, values);
    const updated = get('SELECT id, name, email, created_at FROM users WHERE id = ?', [userId]);
    res.json(updated);
  } catch (err) {
    console.error('Update user error:', err);
    res.status(500).json({ error: 'Erro ao atualizar usuário' });
  }
});

router.delete('/:id', auth, (req, res) => {
  try {
    if (!isAdminUser(req)) return res.status(403).json({ error: 'Apenas administradores' });
    const userId = Number(req.params.id);
    if (userId === req.userId) return res.status(400).json({ error: 'Não pode excluir o próprio usuário' });
    const user = get('SELECT id FROM users WHERE id = ?', [userId]);
    if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });
    query('DELETE FROM users WHERE id = ?', [userId]);
    res.json({ message: 'Usuário removido' });
  } catch (err) {
    console.error('Delete user error:', err);
    res.status(500).json({ error: 'Erro ao remover usuário' });
  }
});

module.exports = router;
