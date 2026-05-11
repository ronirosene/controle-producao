const express = require('express');
const multer = require('multer');
const path = require('path');
const XLSX = require('xlsx');
const { db, query, get } = require('../db/sqlite');
const { auth } = require('../middleware/auth');
const { parseSheet, isNewFormat } = require('../services/import');

const router = express.Router();

const upload = multer({
  dest: path.join(__dirname, '..', '..', 'uploads'),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (['.xlsx', '.xls', '.csv'].includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Apenas arquivos .xlsx, .xls e .csv são permitidos'));
    }
  },
});

router.post('/import', auth, upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Nenhum arquivo enviado' });
    }
    const workbook = XLSX.readFile(req.file.path);
    const sheetNames = workbook.SheetNames;

    if (sheetNames.length === 0) {
      return res.status(400).json({ error: 'Planilha vazia' });
    }

    const firstSheet = workbook.Sheets[sheetNames[0]];
    const headerRow = XLSX.utils.sheet_to_json(firstSheet, { header: 1 })[0];
    const newFormat = isNewFormat(headerRow);

    const imported = [];

    const importTransaction = db.transaction(() => {
      if (newFormat) {
        const fileName = path.basename(req.file.originalname, path.extname(req.file.originalname));
        const sheetName = sheetNames[0];
        const produtos = parseSheet(workbook, sheetName);
        if (produtos.length > 0) {
          const servicoResult = query(
            'INSERT INTO servicos (user_id, nome) VALUES (?, ?)',
            [req.userId, fileName]
          );
          const servicoId = servicoResult.lastInsertRowid;

          for (const prod of produtos) {
            const prodResult = query(
              `INSERT INTO produtos (servico_id, user_id, nome, cor, detalhe, observacao, qtd_total)
               VALUES (?, ?, ?, ?, ?, ?, ?)`,
              [servicoId, req.userId, prod.nome, prod.cor, prod.detalhe, prod.observacao, prod.qtd_total]
            );
            const produtoId = prodResult.lastInsertRowid;

            for (const mov of prod.movimentacoes) {
              query(
                `INSERT INTO movimentacoes (produto_id, setor, quantidade, data_entrada, data_saida)
                 VALUES (?, ?, ?, ?, ?)`,
                [produtoId, mov.setor, mov.quantidade, mov.data_entrada, mov.data_saida]
              );
            }
          }

          imported.push({
            servico: fileName,
            produtos_count: produtos.length,
            id: servicoId,
          });
        }
      } else {
        for (const sheetName of sheetNames) {
          const produtos = parseSheet(workbook, sheetName);
          if (produtos.length === 0) continue;

          const servicoResult = query(
            'INSERT INTO servicos (user_id, nome) VALUES (?, ?)',
            [req.userId, sheetName]
          );
          const servicoId = servicoResult.lastInsertRowid;

          for (const prod of produtos) {
            const prodResult = query(
              `INSERT INTO produtos (servico_id, user_id, nome, cor, detalhe, observacao, qtd_total)
               VALUES (?, ?, ?, ?, ?, ?, ?)`,
              [servicoId, req.userId, prod.nome, prod.cor, prod.detalhe, prod.observacao, prod.qtd_total]
            );
            const produtoId = prodResult.lastInsertRowid;

            for (const mov of prod.movimentacoes) {
              query(
                `INSERT INTO movimentacoes (produto_id, setor, quantidade, data_entrada, data_saida)
                 VALUES (?, ?, ?, ?, ?)`,
                [produtoId, mov.setor, mov.quantidade, mov.data_entrada, mov.data_saida]
              );
            }
          }

          imported.push({
            servico: sheetName,
            produtos_count: produtos.length,
            id: servicoId,
          });
        }
      }
    });

    importTransaction();
    res.status(201).json({ imported });
  } catch (err) {
    console.error('Import error:', err);
    res.status(500).json({ error: 'Erro ao importar planilha: ' + err.message });
  }
});

router.get('/', auth, (req, res) => {
  try {
    const rows = query(
      `SELECT s.id, s.nome, s.created_at,
              COUNT(p.id) AS total_produtos,
              COALESCE(SUM(p.qtd_total), 0) AS total_pecas,
              COUNT(CASE WHEN EXISTS (
                SELECT 1 FROM movimentacoes m2
                WHERE m2.produto_id = p.id AND m2.setor = 'embalagem' AND m2.quantidade > 0
              ) THEN 1 END) AS produtos_finalizados
       FROM servicos s
       LEFT JOIN produtos p ON p.servico_id = s.id
       GROUP BY s.id, s.nome, s.created_at
       ORDER BY s.created_at DESC`,
      []
    );
    res.json(rows);
  } catch (err) {
    console.error('List servicos error:', err);
    res.status(500).json({ error: 'Erro ao listar serviços' });
  }
});

router.get('/:id', auth, (req, res) => {
  try {
    const servico = get(
      'SELECT id, nome, created_at, data_inicio FROM servicos WHERE id = ?',
      [req.params.id]
    );
    if (!servico) {
      return res.status(404).json({ error: 'Serviço não encontrado' });
    }

    const produtos = query(
      `SELECT p.id, p.nome, p.cor, p.detalhe, p.observacao, p.qtd_total, p.em_estoque, p.created_at
       FROM produtos p
       WHERE p.servico_id = ?
       ORDER BY
         CASE
           WHEN EXISTS (SELECT 1 FROM movimentacoes m WHERE m.produto_id = p.id AND m.setor = 'marcenaria' AND m.quantidade > 0) THEN 0
           WHEN EXISTS (SELECT 1 FROM movimentacoes m WHERE m.produto_id = p.id AND m.setor = 'lixa' AND m.quantidade > 0) THEN 1
           WHEN EXISTS (SELECT 1 FROM movimentacoes m WHERE m.produto_id = p.id AND m.setor = 'pintura' AND m.quantidade > 0) THEN 2
           WHEN EXISTS (SELECT 1 FROM movimentacoes m WHERE m.produto_id = p.id AND m.setor = 'embalagem' AND m.quantidade > 0) THEN 3
           ELSE 4
         END,
         p.nome ASC`,
      [req.params.id]
    );

    for (const prod of produtos) {
      const movs = query(
        `SELECT setor, quantidade, data_entrada, data_saida
         FROM movimentacoes WHERE produto_id = ?
         ORDER BY id`,
        [prod.id]
      );
      prod.movimentacoes = movs;
    }

    res.json({ ...servico, produtos });
  } catch (err) {
    console.error('Get servico error:', err);
    res.status(500).json({ error: 'Erro ao buscar serviço' });
  }
});

const ADMIN_EMAILS_SERVICOS = ['ronyrosene@gmail.com', 'pcp@moveispelinson.com.br'];

router.put('/:id', auth, (req, res) => {
  try {
    const user = req.userId && get('SELECT email FROM users WHERE id = ?', [req.userId]);
    if (!user || !ADMIN_EMAILS_SERVICOS.includes(user.email)) {
      return res.status(403).json({ error: 'Apenas usuários autorizados podem editar o serviço' });
    }
    const { nome, data_inicio } = req.body;
    const updates = [];
    const values = [];
    if (nome !== undefined && nome.trim()) { updates.push('nome = ?'); values.push(nome.trim()); }
    if (data_inicio !== undefined) { updates.push('data_inicio = ?'); values.push(data_inicio || null); }
    if (updates.length === 0) {
      return res.status(400).json({ error: 'Nenhum campo para atualizar' });
    }
    updates.push("updated_at = datetime('now')");
    values.push(req.params.id);
    const result = query(
      `UPDATE servicos SET ${updates.join(', ')} WHERE id = ?`,
      values
    );
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Serviço não encontrado' });
    }
    res.json({ message: 'Serviço atualizado' });
  } catch (err) {
    console.error('Update servico error:', err);
    res.status(500).json({ error: 'Erro ao atualizar serviço' });
  }
});

router.delete('/:id', auth, (req, res) => {
  try {
    const user = get('SELECT email FROM users WHERE id = ?', [req.userId]);
    if (!user || !ADMIN_EMAILS_SERVICOS.includes(user.email)) {
      return res.status(403).json({ error: 'Apenas usuários autorizados podem excluir serviços' });
    }
    const result = query(
      'DELETE FROM servicos WHERE id = ?',
      [req.params.id]
    );
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Serviço não encontrado' });
    }
    res.json({ message: 'Serviço removido' });
  } catch (err) {
    console.error('Delete servico error:', err);
    res.status(500).json({ error: 'Erro ao remover serviço' });
  }
});

module.exports = router;
