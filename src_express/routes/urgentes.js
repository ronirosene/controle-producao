const express = require('express');
const { db, query, get } = require('../db/sqlite');
const { auth } = require('../middleware/auth');

const router = express.Router();

router.get('/', auth, (req, res) => {
  try {
    const rows = query(
      `SELECT pu.id, pu.produto_id, pu.data_despacho, pu.observacao, pu.created_at,
              p.nome AS produto_nome, p.qtd_total, p.cor,
              s.id AS servico_id, s.nome AS servico_nome
       FROM produtos_urgentes pu
       JOIN produtos p ON p.id = pu.produto_id
       JOIN servicos s ON s.id = p.servico_id
       ORDER BY pu.data_despacho ASC, s.nome, p.nome`,
      []
    );
    res.json(rows);
  } catch (err) {
    console.error('Urgentes error:', err);
    res.status(500).json({ error: 'Erro ao carregar produtos urgentes' });
  }
});

router.post('/', auth, (req, res) => {
  try {
    const { produto_id, data_despacho, observacao } = req.body;
    if (!produto_id || !data_despacho) {
      return res.status(400).json({ error: 'Produto e data de despacho são obrigatórios' });
    }
    const prod = get('SELECT id FROM produtos WHERE id = ?', [produto_id]);
    if (!prod) {
      return res.status(404).json({ error: 'Produto não encontrado' });
    }
    const existing = get('SELECT id FROM produtos_urgentes WHERE produto_id = ?', [produto_id]);
    if (existing) {
      return res.status(400).json({ error: 'Produto já está marcado como urgente' });
    }
    const result = query(
      `INSERT INTO produtos_urgentes (produto_id, data_despacho, observacao, created_by)
       VALUES (?, ?, ?, ?)`,
      [produto_id, data_despacho, (observacao || '').trim(), req.userId]
    );
    res.status(201).json({ id: result.lastInsertRowid, message: 'Produto marcado como urgente' });
  } catch (err) {
    console.error('Create urgente error:', err);
    res.status(500).json({ error: 'Erro ao marcar produto como urgente: ' + err.message });
  }
});

router.post('/batch', auth, (req, res) => {
  try {
    const { items } = req.body;
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Lista de produtos é obrigatória' });
    }
    const results = { added: [], skipped: [], errors: [] };
    const addOne = db.transaction((item) => {
      const { produto_id, data_despacho, observacao } = item;
      if (!produto_id || !data_despacho) {
        results.errors.push({ produto_id, error: 'Produto e data são obrigatórios' });
        return;
      }
      const prod = get('SELECT id, nome FROM produtos WHERE id = ?', [produto_id]);
      if (!prod) {
        results.errors.push({ produto_id, error: 'Produto não encontrado' });
        return;
      }
      const existing = get('SELECT id FROM produtos_urgentes WHERE produto_id = ?', [produto_id]);
      if (existing) {
        results.skipped.push({ produto_id, nome: prod.nome, error: 'Já está marcado como urgente' });
        return;
      }
      query(
        `INSERT INTO produtos_urgentes (produto_id, data_despacho, observacao, created_by)
         VALUES (?, ?, ?, ?)`,
        [produto_id, data_despacho, (observacao || '').trim(), req.userId]
      );
      results.added.push({ produto_id, nome: prod.nome });
    });
    const batchAll = db.transaction(() => {
      for (const item of items) {
        addOne(item);
      }
    });
    batchAll();
    res.status(201).json(results);
  } catch (err) {
    console.error('Batch urgente error:', err);
    res.status(500).json({ error: 'Erro ao adicionar urgências em lote: ' + err.message });
  }
});

router.put('/:id', auth, (req, res) => {
  try {
    const { data_despacho, observacao } = req.body;
    const urgId = Number(req.params.id);
    const urg = get('SELECT id FROM produtos_urgentes WHERE id = ?', [urgId]);
    if (!urg) {
      return res.status(404).json({ error: 'Urgência não encontrada' });
    }
    const updates = [];
    const values = [];
    if (data_despacho !== undefined) { updates.push('data_despacho = ?'); values.push(data_despacho); }
    if (observacao !== undefined) { updates.push('observacao = ?'); values.push(observacao); }
    if (updates.length === 0) {
      return res.status(400).json({ error: 'Nenhum campo para atualizar' });
    }
    updates.push("updated_at = datetime('now')");
    values.push(urgId);
    query(`UPDATE produtos_urgentes SET ${updates.join(', ')} WHERE id = ?`, values);
    res.json({ message: 'Urgência atualizada' });
  } catch (err) {
    console.error('Update urgente error:', err);
    res.status(500).json({ error: 'Erro ao atualizar urgência' });
  }
});

router.delete('/:id', auth, (req, res) => {
  try {
    const urgId = Number(req.params.id);
    const urg = get('SELECT id FROM produtos_urgentes WHERE id = ?', [urgId]);
    if (!urg) {
      return res.status(404).json({ error: 'Urgência não encontrada' });
    }
    query('DELETE FROM produtos_urgentes WHERE id = ?', [urgId]);
    res.json({ message: 'Urgência removida' });
  } catch (err) {
    console.error('Delete urgente error:', err);
    res.status(500).json({ error: 'Erro ao remover urgência' });
  }
});

module.exports = router;
