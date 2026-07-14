import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getStats() {
    const servicos: any[] = await this.prisma.$queryRawUnsafe(`
      SELECT s.nome AS servico, s.id AS servico_id, s.data_inicio,
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
       GROUP BY s.id, s.nome, s.data_inicio
       ORDER BY s.nome DESC
    `);

    const observacoesCount: any = await this.prisma.$queryRawUnsafe(`
      SELECT COUNT(*) AS total FROM movimentacoes m
       JOIN produtos p ON p.id = m.produto_id
       WHERE m.observacao IS NOT NULL AND m.observacao != ''
    `);

    const ultimaAtualizacao: any = await this.prisma.$queryRawUnsafe(`
      SELECT m.created_at, u.name AS user_name
       FROM movimentacoes m
       LEFT JOIN users u ON u.id = m.user_id
       ORDER BY m.created_at DESC
       LIMIT 1
    `);

    return {
      servicos,
      observacoes_pendentes: observacoesCount[0]?.total || 0,
      ultima_atualizacao: ultimaAtualizacao[0] || null,
    };
  }
}
