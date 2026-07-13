const XLSX = require('xlsx');

const SETORES = ['marcenaria', 'lixa', 'pintura', 'embalagem'];

function isNewFormat(headerRow) {
  if (!headerRow) return false;
  const header = headerRow.map(h => String(h || '').toLowerCase().trim());
  return header.some(h => h === 'ar_desc' || h === 'ar_qtde' || h === 'co_desc');
}

function parseNewSheet(workbook, sheetName) {
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) return [];
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
  if (data.length < 2) return [];

  const rows = [];
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row || row.length < 4) continue;

    const nome = String(row[2] || '').trim();
    if (!nome) continue;

    const qtdTotal = parseInt(row[3], 10);
    if (isNaN(qtdTotal) || qtdTotal <= 0) continue;

    const cor = String(row[24] || '').trim();
    const detalhe = String(row[29] || '').trim();
    const observacao = String(row[10] || '').trim();

    rows.push({
      nome,
      cor,
      detalhe,
      observacao,
      qtd_total: qtdTotal,
      setor_atual: 'Em Marcenaria',
      status: '',
      movimentacoes: [{
        setor: 'marcenaria',
        quantidade: qtdTotal,
        data_entrada: null,
        data_saida: null,
      }],
    });
  }

  return rows;
}

function parseOldSheet(workbook, sheetName) {
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) return [];
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
  if (data.length < 2) return [];

  const rows = [];
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row || row.length < 3) continue;

    const qtdTotal = parseInt(row[2], 10);
    if (isNaN(qtdTotal) || qtdTotal <= 0) continue;

    const nome = String(row[3] || '').trim();
    if (!nome) continue;

    const setorAtual = String(row[0] || '').trim();
    const observacao = String(row[6] || '').trim();

    const movimentacoes = [];
    for (let s = 0; s < 4; s++) {
      const qtdCol = 7 + s * 2;
      const dataCol = 8 + s * 2;
      const qtd = parseInt(row[qtdCol], 10);
      if (!isNaN(qtd) && qtd > 0) {
        let dataEntrada = null;
        let dataSaida = null;
        if (row[dataCol]) {
          const rawDate = String(row[dataCol]).trim();
          if (rawDate) {
            const parsed = parseDate(rawDate);
            if (parsed) {
              if (qtd > 0 && qtd < qtdTotal) {
                dataEntrada = parsed;
              }
              dataSaida = parsed;
            }
          }
        }
        movimentacoes.push({
          setor: SETORES[s],
          quantidade: qtd,
          data_entrada: dataEntrada,
          data_saida: dataSaida,
        });
      }
    }

    if (movimentacoes.length === 0) {
      movimentacoes.push({
        setor: 'marcenaria',
        quantidade: qtdTotal,
        data_entrada: null,
        data_saida: null,
      });
    }

    rows.push({
      nome,
      cor: String(row[4] || '').trim(),
      detalhe: String(row[5] || '').trim(),
      observacao,
      qtd_total: qtdTotal,
      setor_atual: setorAtual,
      status: String(row[15] || '').trim(),
      movimentacoes,
    });
  }

  return rows;
}

function parseSheet(workbook, sheetName) {
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) return [];
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
  if (data.length < 2) return [];

  if (isNewFormat(data[0])) {
    return parseNewSheet(workbook, sheetName);
  }
  return parseOldSheet(workbook, sheetName);
}

function parseDate(value) {
  if (!value) return null;
  if (typeof value === 'number') {
    const date = XLSX.SSF.parse_date_code(value);
    if (date) {
      return `${date.y}-${String(date.m).padStart(2, '0')}-${String(date.d).padStart(2, '0')}`;
    }
    return null;
  }
  const str = String(value).trim();
  if (!str) return null;
  const patterns = [
    /^(\d{2})\/(\d{2})\/(\d{4})$/,
    /^(\d{2})\/(\d{2})$/,
    /^(\d{4})-(\d{2})-(\d{2})$/,
  ];
  for (const pat of patterns) {
    const m = str.match(pat);
    if (m) {
      if (m[3] && m[3].length === 4) {
        return `${m[3]}-${m[2]}-${m[1]}`;
      }
      if (!m[3]) {
        return `2026-${m[2]}-${m[1]}`;
      }
      if (m[1].length === 4) {
        return `${m[1]}-${m[2]}-${m[3]}`;
      }
    }
  }
  if (/^\d+$/.test(str)) {
    const num = parseInt(str, 10);
    if (num > 40000 && num < 60000) {
      const date = XLSX.SSF.parse_date_code(num);
      if (date) {
        return `${date.y}-${String(date.m).padStart(2, '0')}-${String(date.d).padStart(2, '0')}`;
      }
    }
  }
  return null;
}

module.exports = { parseSheet, isNewFormat };
