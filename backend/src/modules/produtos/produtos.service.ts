import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';

const SETORES_ORDEM = ['marcenaria', 'lixa', 'pintura', 'embalagem'];
const ADMIN_EMAILS = ['ronyrosene@gmail.com', 'pcp@moveispelinson.com.br'];

@Injectable()
export class ProdutosService {
  constructor(private prisma: PrismaService) {}

  async create(data: { servico_id: number; nome: string; cor?: string; detalhe?: string; observacao?: string; qtd_total?: number }, userEmail: string, userId: number) {
    if (!ADMIN_EMAILS.includes(userEmail)) {
      throw new ForbiddenException('Apenas usuários autorizados podem criar produtos');
    }
    const servico = await this.prisma.servico.findUnique({ where: { id: data.servico_id } });
    if (!servico) throw new NotFoundException('Serviço não encontrado');

    const qtd = data.qtd_total || 1;
    const now = new Date().toISOString();
    const prod = await this.prisma.produto.create({
      data: {
        servicoId: data.servico_id,
        userId,
        nome: data.nome.trim(),
        cor: (data.cor || '').trim(),
        detalhe: (data.detalhe || '').trim(),
        observacao: (data.observacao || '').trim(),
        qtdTotal: qtd,
        createdAt: now,
      },
    });
    await this.prisma.movimentacao.create({
      data: { produtoId: prod.id, setor: 'marcenaria', quantidade: qtd, createdAt: now },
    });

    return { id: prod.id, message: 'Produto adicionado' };
  }

  async mover(
    produtoId: number,
    data: { quantidade: number; setor_origem: string; setor_destino: string; data_movimento?: string; observacao?: string },
    userId: number,
  ) {
    if (!data.quantidade || data.quantidade <= 0) {
      throw new BadRequestException('Quantidade deve ser maior que zero');
    }
    if (!SETORES_ORDEM.includes(data.setor_origem)) {
      throw new BadRequestException('Setor de origem inválido');
    }
    if (!SETORES_ORDEM.includes(data.setor_destino)) {
      throw new BadRequestException('Setor de destino inválido');
    }

    const prod = await this.prisma.produto.findUnique({ where: { id: produtoId } });
    if (!prod) throw new NotFoundException('Produto não encontrado');

    const origem = await this.prisma.movimentacao.findFirst({
      where: { produtoId, setor: data.setor_origem },
    });

    if (!origem || !origem.quantidade || origem.quantidade < data.quantidade) {
      throw new BadRequestException(
        `Quantidade insuficiente em ${data.setor_origem}. Disponível: ${origem?.quantidade || 0}`,
      );
    }

    const obs = (data.observacao || '').trim();
    const dataMov = data.data_movimento || new Date().toISOString().split('T')[0];

    const novaQtdOrigem = (origem.quantidade || 0) - data.quantidade;

    if (novaQtdOrigem === 0) {
      await this.prisma.movimentacao.update({
        where: { id: origem.id },
        data: { quantidade: 0, dataSaida: dataMov, observacao: obs, userId },
      });
    } else {
      await this.prisma.movimentacao.update({
        where: { id: origem.id },
        data: { quantidade: novaQtdOrigem, observacao: obs },
      });
    }

    const dest = await this.prisma.movimentacao.findFirst({
      where: { produtoId, setor: data.setor_destino },
    });

    if (dest) {
      await this.prisma.movimentacao.update({
        where: { id: dest.id },
        data: { quantidade: (dest.quantidade || 0) + data.quantidade, dataEntrada: dataMov, userId },
      });
    } else {
      await this.prisma.movimentacao.create({
        data: {
          produtoId,
          setor: data.setor_destino,
          quantidade: data.quantidade,
          dataEntrada: dataMov,
          userId,
        },
      });
    }

    return this.prisma.movimentacao.findMany({
      where: { produtoId },
      orderBy: { id: 'asc' },
    });
  }

  async editar(produtoId: number, data: any, userEmail: string) {
    if (!ADMIN_EMAILS.includes(userEmail)) {
      throw new ForbiddenException('Apenas usuários autorizados podem realizar esta operação');
    }
    const prod = await this.prisma.produto.findUnique({ where: { id: produtoId } });
    if (!prod) throw new NotFoundException('Produto não encontrado');

    const updates: any = {};
    if (data.nome !== undefined) updates.nome = data.nome;
    if (data.cor !== undefined) updates.cor = data.cor;
    if (data.detalhe !== undefined) updates.detalhe = data.detalhe;
    if (data.observacao !== undefined) updates.observacao = data.observacao;
    if (data.qtd_total !== undefined) updates.qtdTotal = data.qtd_total;

    return this.prisma.produto.update({ where: { id: produtoId }, data: updates });
  }

  async toggleEstoque(produtoId: number) {
    const prod = await this.prisma.produto.findUnique({ where: { id: produtoId } });
    if (!prod) throw new NotFoundException('Produto não encontrado');

    const novo = prod.emEstoque ? 0 : 1;
    await this.prisma.produto.update({
      where: { id: produtoId },
      data: { emEstoque: novo },
    });
    return { em_estoque: novo };
  }

  async remove(produtoId: number, userEmail: string) {
    if (!ADMIN_EMAILS.includes(userEmail)) {
      throw new ForbiddenException('Apenas usuários autorizados podem excluir produtos');
    }
    const prod = await this.prisma.produto.findUnique({ where: { id: produtoId } });
    if (!prod) throw new NotFoundException('Produto não encontrado');

    await this.prisma.produto.delete({ where: { id: produtoId } });
    return { message: 'Produto excluído' };
  }

  async getObservacoes(produtoId?: number) {
    const where: any = {
      observacao: { not: '' },
    };
    if (produtoId) where.produtoId = produtoId;

    return this.prisma.movimentacao.findMany({
      where,
      include: {
        produto: {
          select: { id: true, nome: true, servicoId: true, servico: { select: { id: true, nome: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateObservacao(movId: number, observacao: string) {
    const mov = await this.prisma.movimentacao.findUnique({ where: { id: movId } });
    if (!mov) throw new NotFoundException('Observação não encontrada');

    return this.prisma.movimentacao.update({
      where: { id: movId },
      data: { observacao: observacao || '' },
    });
  }

  async removeObservacao(movId: number) {
    const mov = await this.prisma.movimentacao.findUnique({ where: { id: movId } });
    if (!mov) throw new NotFoundException('Observação não encontrada');

    return this.prisma.movimentacao.update({
      where: { id: movId },
      data: { observacao: '' },
    });
  }

  async getRelatorio() {
    return this.prisma.$queryRawUnsafe(`
      SELECT m.id, m.setor, m.quantidade, m.data_entrada, m.data_saida, m.created_at, m.observacao,
              p.nome AS produto_nome, p.id AS produto_id,
              s.nome AS servico_nome, s.id AS servico_id,
              u.name AS user_name
       FROM movimentacoes m
       JOIN produtos p ON p.id = m.produto_id
       JOIN servicos s ON s.id = p.servico_id
       LEFT JOIN users u ON u.id = m.user_id
       ORDER BY m.created_at DESC
       LIMIT 500
    `);
  }

  async getDashboard() {
    return this.prisma.$queryRawUnsafe(`
      SELECT s.nome AS servico, s.id AS servico_id, s.data_inicio,
              COUNT(p.id) AS total_produtos,
              COALESCE(SUM(p.qtd_total), 0) AS total_pecas,
              COUNT(CASE WHEN EXISTS (
                SELECT 1 FROM movimentacoes m WHERE m.produto_id = p.id AND m.setor = 'embalagem' AND m.quantidade > 0
              ) THEN 1 END) AS produtos_finalizados
       FROM servicos s
       LEFT JOIN produtos p ON p.servico_id = s.id
       GROUP BY s.id, s.nome, s.data_inicio
       ORDER BY s.nome DESC
    `);
  }

  async getPosicaoAtual() {
    return this.prisma.$queryRawUnsafe(`
      SELECT
        p.id AS produto_id,
        p.nome AS produto_nome,
        p.qtd_total,
        s.id AS servico_id,
        s.nome AS servico_nome,
        m.setor,
        m.quantidade,
        m.data_entrada,
        m.observacao,
        CAST(julianday('now') - julianday(COALESCE(m.data_entrada, p.created_at)) AS INTEGER) AS dias_no_setor
      FROM movimentacoes m
      JOIN produtos p ON p.id = m.produto_id
      JOIN servicos s ON s.id = p.servico_id
      WHERE m.quantidade > 0
      ORDER BY s.nome, p.nome,
        CASE m.setor
          WHEN 'marcenaria' THEN 1
          WHEN 'lixa' THEN 2
          WHEN 'pintura' THEN 3
          WHEN 'embalagem' THEN 4
          ELSE 5
        END
    `);
  }
}
