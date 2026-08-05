import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import ExcelJS from 'exceljs';
import * as XLSX from '@e965/xlsx';
import { Readable } from 'stream';

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || 'ronyrosene@gmail.com,pcp@moveispelinson.com.br')
  .split(',').map((email) => email.trim().toLowerCase()).filter(Boolean);

@Injectable()
export class ServicosService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.$queryRawUnsafe(`
      SELECT s.id, s.nome, s.created_at, s.data_inicio,
              COUNT(p.id) AS total_produtos,
              COALESCE(SUM(p.qtd_total), 0) AS total_pecas,
              COALESCE(SUM(m2.pecas_emb), 0) AS pecas_finalizadas
       FROM servicos s
       LEFT JOIN produtos p ON p.servico_id = s.id
       LEFT JOIN (
         SELECT produto_id, SUM(quantidade) AS pecas_emb
         FROM movimentacoes
         WHERE setor = 'embalagem' AND quantidade > 0
         GROUP BY produto_id
       ) m2 ON m2.produto_id = p.id
       GROUP BY s.id, s.nome, s.created_at, s.data_inicio
       ORDER BY s.nome DESC
    `);
  }

  async findOne(id: number) {
    const servico = await this.prisma.servico.findUnique({
      where: { id },
      include: {
        produtos: {
          orderBy: [{ id: 'asc' }],
          include: {
            movimentacoes: { orderBy: { id: 'asc' } },
            produtosUrgentes: { select: { id: true, dataDespacho: true, observacao: true } },
          },
        },
      },
    });
    if (!servico) throw new NotFoundException('Serviço não encontrado');
    return servico;
  }

  async update(id: number, data: { nome?: string; dataInicio?: string }, userEmail: string) {
    if (!ADMIN_EMAILS.includes(userEmail.toLowerCase())) {
      throw new ForbiddenException('Apenas usuários autorizados podem editar o serviço');
    }
    const updates: any = {};
    if (data.nome?.trim()) updates.nome = data.nome.trim();
    if (data.dataInicio !== undefined) updates.dataInicio = data.dataInicio || null;

    const servico = await this.prisma.servico.findUnique({ where: { id } });
    if (!servico) throw new NotFoundException('Serviço não encontrado');

    return this.prisma.servico.update({ where: { id }, data: updates });
  }

  async importFile(buffer: Buffer, filename: string) {
    let rows: any[][] = [];
    const normalizedFilename = filename.toLowerCase();

    if (normalizedFilename.endsWith('.xls')) {
      const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });
      const firstSheetName = workbook.SheetNames[0];
      if (!firstSheetName) throw new BadRequestException('Planilha vazia');
      rows = XLSX.utils.sheet_to_json<any[]>(workbook.Sheets[firstSheetName], {
        header: 1,
        defval: '',
        raw: false,
      });
    } else {
      const workbook = new ExcelJS.Workbook();
      if (normalizedFilename.endsWith('.csv')) {
        await workbook.csv.read(Readable.from(buffer));
      } else if (normalizedFilename.endsWith('.xlsx')) {
        await workbook.xlsx.load(buffer as any);
      } else {
        throw new BadRequestException('Formato não suportado. Use XLSX, XLS ou CSV.');
      }
      const worksheet = workbook.worksheets[0];
      if (!worksheet) throw new BadRequestException('Planilha vazia');
      worksheet.eachRow({ includeEmpty: true }, (row) => {
        const values = Array.isArray(row.values) ? row.values.slice(1) : [];
        rows.push(values.map((value: any) => value?.text ?? value?.result ?? value ?? ''));
      });
    }
    if (!rows.length) throw new BadRequestException('Nenhuma linha encontrada');

    const nomeServico = filename.replace(/\.[^.]+$/, '').trim();
    if (!nomeServico) throw new BadRequestException('Nome do arquivo inválido');

    const now = new Date().toISOString();
    let servico = await this.prisma.servico.findFirst({ where: { nome: nomeServico } });
    if (!servico) {
      servico = await this.prisma.servico.create({
        data: { nome: nomeServico, createdAt: now },
      });
    }

    let produtos_count = 0;
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const nomeProduto = String(row[2] || '').trim();
      if (!nomeProduto) continue;
      const cor = String(row[24] || '').trim();
      const detalhe = String(row[29] || '').trim();
      const qtdStr = String(row[3] || '0').trim();
      const qtd = parseInt(qtdStr.replace(/\D/g, ''), 10) || 0;

      const product = await this.prisma.produto.create({
        data: {
          servicoId: servico.id,
          nome: nomeProduto,
          cor: cor || '',
          detalhe: detalhe || '',
          qtdTotal: qtd,
          emEstoque: 0,
          createdAt: now,
        },
      });

      if (qtd > 0) {
        await this.prisma.movimentacao.create({
          data: {
            produtoId: product.id,
            setor: 'marcenaria',
            quantidade: qtd,
            dataEntrada: new Date().toISOString().split('T')[0],
            createdAt: now,
          },
        });
      }

      produtos_count++;
    }

    return { imported: [{ servico: nomeServico, produtos_count }] };
  }

  async remove(id: number, userEmail: string) {
    if (!ADMIN_EMAILS.includes(userEmail.toLowerCase())) {
      throw new ForbiddenException('Apenas usuários autorizados podem excluir serviços');
    }
    const servico = await this.prisma.servico.findUnique({ where: { id } });
    if (!servico) throw new NotFoundException('Serviço não encontrado');

    return this.prisma.servico.delete({ where: { id } });
  }
}
