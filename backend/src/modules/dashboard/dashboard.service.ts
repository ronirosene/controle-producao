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
              COUNT(CASE WHEN EXISTS (
                SELECT 1 FROM movimentacoes m WHERE m.produto_id = p.id AND m.setor = 'embalagem' AND m.quantidade > 0
              ) THEN 1 END) AS produtos_finalizados
       FROM servicos s
       LEFT JOIN produtos p ON p.servico_id = s.id
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
