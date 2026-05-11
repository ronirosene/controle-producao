const express = require('express');
const { db, query, get } = require('../db/sqlite');
const { auth } = require('../middleware/auth');

const router = express.Router();

const SETORES_ORDEM = ['marcenaria', 'lixa', 'pintura', 'embalagem'];
const ADMIN_EMAILS_PRODUTOS = ['ronyrosene@gmail.com', 'pcp@moveispelinson.com.br'];

router.put('/:id/mover', auth, (req, res) => {
  try {
    const { quantidade, setor_origem, setor_destino, data_movimento, observacao } = req.body;
    const produtoId = Number(req.params.id);

    if (!quantidade || quantidade <= 0) {
      return res.status(400).json({ error: 'Quantidade deve ser maior que zero' });
    }
    if (!setor_origem || !setor_destino) {
      return res.status(400).json({ error: 'Setor de origem e destino são obrigatórios' });
    }
    if (!SETORES_ORDEM.includes(setor_origem)) {
      return res.status(400).json({ error: 'Setor de origem inválido' });
    }
    if (!SETORES_ORDEM.includes(setor_destino)) {
      return res.status(400).json({ error: 'Setor de destino inválido' });
    }

    const prod = get('SELECT id, qtd_total FROM produtos WHERE id = ?', [produtoId]);
    if (!prod) {
      return res.status(404).json({ error: 'Produto não encontrado' });
    }

    const origem = get(
      'SELECT id, quantidade FROM movimentacoes WHERE produto_id = ? AND setor = ?',
      [produtoId, setor_origem]
    );

    if (!origem || origem.quantidade < quantidade) {
      return res.status(400).json({
        error: `Quantidade insuficiente em ${setor_origem}. Disponível: ${origem?.quantidade || 0}`,
      });
    }

    const obs = (observacao || '').trim();

    const moveTransaction = db.transaction(() => {
      const novaQtdOrigem = origem.quantidade - quantidade;

      if (novaQtdOrigem === 0) {
        query(
          'UPDATE movimentacoes SET quantidade = 0, data_saida = ?, observacao = ?, user_id = ? WHERE id = ?',
          [data_movimento || new Date().toISOString().split('T')[0], obs, req.userId, origem.id]
        );
      } else {
        query(
          'UPDATE movimentacoes SET quantidade = ?, observacao = ? WHERE id = ?',
          [novaQtdOrigem, obs, origem.id]
        );
      }

      const dest = get(
        'SELECT id, quantidade FROM movimentacoes WHERE produto_id = ? AND setor = ?',
        [produtoId, setor_destino]
      );

      if (dest) {
        query(
          'UPDATE movimentacoes SET quantidade = quantidade + ?, data_entrada = ?, user_id = ? WHERE id = ?',
          [quantidade, data_movimento || new Date().toISOString().split('T')[0], req.userId, dest.id]
        );
      } else {
        query(
          `INSERT INTO movimentacoes (produto_id, setor, quantidade, data_entrada, user_id)
           VALUES (?, ?, ?, ?, ?)`,
          [produtoId, setor_destino, quantidade, data_movimento || new Date().toISOString().split('T')[0], req.userId]
        );
      }
    });

    moveTransaction();

    const movs = query(
      `SELECT setor, quantidade, data_entrada, data_saida, observacao
       FROM movimentacoes WHERE produto_id = ?
       ORDER BY id`,
      [produtoId]
    );

    res.json({ movimentacoes: movs });
  } catch (err) {
    console.error('Move error:', err);
    res.status(500).json({ error: 'Erro ao movimentar produto: ' + err.message });
  }
});

router.put('/:id/editar', auth, (req, res) => {
  try {
    const user = get('SELECT email FROM users WHERE id = ?', [req.userId]);
    if (!user || !ADMIN_EMAILS_PRODUTOS.includes(user.email)) {
      return res.status(403).json({ error: 'Apenas usuários autorizados podem realizar esta operação' });
    }
    const { nome, cor, detalhe, observacao, qtd_total } = req.body;
    const produtoId = Number(req.params.id);

    const prod = get('SELECT id FROM produtos WHERE id = ?', [produtoId]);
    if (!prod) {
      return res.status(404).json({ error: 'Produto não encontrado' });
    }

    const updates = [];
    const values = [];

    if (nome !== undefined) { updates.push('nome = ?'); values.push(nome); }
    if (cor !== undefined) { updates.push('cor = ?'); values.push(cor); }
    if (detalhe !== undefined) { updates.push('detalhe = ?'); values.push(detalhe); }
    if (observacao !== undefined) { updates.push('observacao = ?'); values.push(observacao); }
    if (qtd_total !== undefined) { updates.push('qtd_total = ?'); values.push(qtd_total); }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'Nenhum campo para atualizar' });
    }

    updates.push("updated_at = datetime('now')");
    values.push(produtoId);

    query(
      `UPDATE produtos SET ${updates.join(', ')} WHERE id = ?`,
      values
    );

    res.json({ message: 'Produto atualizado' });
  } catch (err) {
    console.error('Edit error:', err);
    res.status(500).json({ error: 'Erro ao editar produto' });
  }
});

router.put('/:id/estoque', auth, (req, res) => {
  try {
    const produtoId = Number(req.params.id);
    const prod = get('SELECT id, em_estoque FROM produtos WHERE id = ?', [produtoId]);
    if (!prod) {
      return res.status(404).json({ error: 'Produto não encontrado' });
    }
    const novo = prod.em_estoque ? 0 : 1;
    query('UPDATE produtos SET em_estoque = ? WHERE id = ?', [novo, produtoId]);
    res.json({ em_estoque: novo });
  } catch (err) {
    console.error('Estoque error:', err);
    res.status(500).json({ error: 'Erro ao alternar estoque' });
  }
});

router.delete('/:id', auth, (req, res) => {
  try {
    const user = get('SELECT email FROM users WHERE id = ?', [req.userId]);
    if (!user || !ADMIN_EMAILS_PRODUTOS.includes(user.email)) {
      return res.status(403).json({ error: 'Apenas usuários autorizados podem realizar esta operação' });
    }
    const produtoId = Number(req.params.id);
    const prod = get('SELECT id FROM produtos WHERE id = ?', [produtoId]);
    if (!prod) return res.status(404).json({ error: 'Produto não encontrado' });
    query('DELETE FROM produtos WHERE id = ?', [produtoId]);
    res.json({ message: 'Produto excluído' });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao excluir produto' });
  }
});

router.post('/', auth, (req, res) => {
  try {
    const user = get('SELECT email FROM users WHERE id = ?', [req.userId]);
    if (!user || !ADMIN_EMAILS_PRODUTOS.includes(user.email)) {
      return res.status(403).json({ error: 'Apenas usuários autorizados podem realizar esta operação' });
    }
    const { servico_id, nome, cor, detalhe, observacao, qtd_total } = req.body;
    if (!servico_id || !nome) {
      return res.status(400).json({ error: 'Serviço e nome do produto são obrigatórios' });
    }
    const serv = get('SELECT id FROM servicos WHERE id = ?', [servico_id]);
    if (!serv) {
      return res.status(404).json({ error: 'Serviço não encontrado' });
    }
    const qtd = parseInt(qtd_total, 10) || 1;
    const result = query(
      `INSERT INTO produtos (servico_id, user_id, nome, cor, detalhe, observacao, qtd_total)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [servico_id, req.userId, nome.trim(), (cor||'').trim(), (detalhe||'').trim(), (observacao||'').trim(), qtd]
    );
    const produtoId = result.lastInsertRowid;
    query(
      `INSERT INTO movimentacoes (produto_id, setor, quantidade)
       VALUES (?, 'marcenaria', ?)`,
      [produtoId, qtd]
    );
    res.status(201).json({ id: produtoId, message: 'Produto adicionado' });
  } catch (err) {
    console.error('Create produto error:', err);
    res.status(500).json({ error: 'Erro ao criar produto: ' + err.message });
  }
});

router.get('/observacoes', auth, (req, res) => {
  try {
    const rows = query(
      `SELECT m.id, m.setor, m.quantidade, m.observacao, m.data_entrada, m.data_saida, m.created_at,
              p.nome AS produto_nome, p.id AS produto_id,
              s.nome AS servico_nome, s.id AS servico_id
       FROM movimentacoes m
       JOIN produtos p ON p.id = m.produto_id
       JOIN servicos s ON s.id = p.servico_id
        WHERE m.observacao IS NOT NULL AND m.observacao != ''
        ORDER BY m.created_at DESC`,
      []
    );
    res.json(rows);
  } catch (err) {
    console.error('Observacoes error:', err);
    res.status(500).json({ error: 'Erro ao carregar observações' });
  }
});

router.put('/observacoes/:id', auth, (req, res) => {
  try {
    const { observacao } = req.body;
    const movId = Number(req.params.id);
    const mov = get('SELECT id FROM movimentacoes WHERE id = ?', [movId]);
    if (!mov) return res.status(404).json({ error: 'Observação não encontrada' });
    query('UPDATE movimentacoes SET observacao = ?, updated_at = datetime(\'now\') WHERE id = ?', [observacao || '', movId]);
    res.json({ message: 'Observação atualizada' });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao editar observação' });
  }
});

router.delete('/observacoes/:id', auth, (req, res) => {
  try {
    const movId = Number(req.params.id);
    const mov = get('SELECT id FROM movimentacoes WHERE id = ?', [movId]);
    if (!mov) return res.status(404).json({ error: 'Observação não encontrada' });
    query('UPDATE movimentacoes SET observacao = \'\', updated_at = datetime(\'now\') WHERE id = ?', [movId]);
    res.json({ message: 'Observação removida' });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao remover observação' });
  }
});

router.get('/relatorio', auth, (req, res) => {
  try {
    const rows = query(
      `SELECT m.id, m.setor, m.quantidade, m.data_entrada, m.data_saida, m.created_at, m.observacao,
              p.nome AS produto_nome, p.id AS produto_id,
              s.nome AS servico_nome, s.id AS servico_id,
              u.name AS user_name
       FROM movimentacoes m
       JOIN produtos p ON p.id = m.produto_id
       JOIN servicos s ON s.id = p.servico_id
       LEFT JOIN users u ON u.id = m.user_id
       ORDER BY m.created_at DESC
       LIMIT 500`,
      []
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao carregar relatório' });
  }
});

router.get('/dashboard', auth, (req, res) => {
  try {
    const servicos = query(
      `SELECT s.nome AS servico, s.id AS servico_id, s.data_inicio,
              COUNT(p.id) AS total_produtos,
              COALESCE(SUM(p.qtd_total), 0) AS total_pecas,
              COUNT(CASE WHEN EXISTS (
                SELECT 1 FROM movimentacoes m WHERE m.produto_id = p.id AND m.setor = 'embalagem' AND m.quantidade > 0
              ) THEN 1 END) AS produtos_finalizados
       FROM servicos s
       LEFT JOIN produtos p ON p.servico_id = s.id
       GROUP BY s.id, s.nome
       ORDER BY s.created_at DESC`,
      []
    );

    const observacoesCount = get(
      `SELECT COUNT(*) AS total FROM movimentacoes m
       JOIN produtos p ON p.id = m.produto_id
       WHERE m.observacao IS NOT NULL AND m.observacao != ''`,
      []
    );

    res.json({ servicos, observacoes_pendentes: observacoesCount.total });
  } catch (err) {
    console.error('Dashboard error:', err);
    res.status(500).json({ error: 'Erro ao carregar dashboard' });
  }
});

module.exports = router;
