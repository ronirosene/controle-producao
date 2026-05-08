const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query, get } = require('../db/sqlite');
const { auth } = require('../middleware/auth');

const router = express.Router();

router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Nome, email e senha são obrigatórios' });
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Email inválido' });
    }
    const sanitizedName = name.replace(/<[^>]*>/g, '');
    const existing = get('SELECT id FROM users WHERE email = ?', [email.toLowerCase()]);
    if (existing) {
      return res.status(409).json({ error: 'Email já cadastrado' });
    }
    const passwordHash = await bcrypt.hash(password, 12);
    const result = query(
      'INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)',
      [sanitizedName, email.toLowerCase(), passwordHash]
    );
    const token = jwt.sign({ userId: result.lastInsertRowid, email: email.toLowerCase() }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({
      token,
      user: { id: result.lastInsertRowid, name: sanitizedName, email: email.toLowerCase() },
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email e senha são obrigatórios' });
    }
    const user = get('SELECT id, name, email, password_hash FROM users WHERE email = ?', [email.toLowerCase()]);
    if (!user) {
      return res.status(401).json({ error: 'Email ou senha incorretos' });
    }
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return res.status(401).json({ error: 'Email ou senha incorretos' });
    }
    const token = jwt.sign({ userId: user.id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user.id, name: user.name, email: user.email } });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

router.get('/me', auth, (req, res) => {
  try {
    const user = get('SELECT id, name, email, created_at FROM users WHERE id = ?', [req.userId]);
    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }
    res.json(user);
  } catch (err) {
    console.error('Me error:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

module.exports = router;
