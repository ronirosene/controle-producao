import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';

@Injectable()
export class UrgentesService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.produtoUrgente.findMany({
      include: {
        produto: {
          select: { id: true, nome: true, qtdTotal: true, servicoId: true, servico: { select: { id: true, nome: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(data: { produto_id: number; data_despacho: string; observacao?: string }, userId: number) {
    const prod = await this.prisma.produto.findUnique({ where: { id: data.produto_id } });
    if (!prod) throw new NotFoundException('Produto não encontrado');

    return this.prisma.produtoUrgente.upsert({
      where: { produtoId: data.produto_id },
      create: {
        produtoId: data.produto_id,
        dataDespacho: data.data_despacho,
        observacao: data.observacao || '',
        createdBy: userId,
      },
      update: {
        dataDespacho: data.data_despacho,
        observacao: data.observacao || '',
      },
    });
  }

  async remove(id: number) {
    const item = await this.prisma.produtoUrgente.findUnique({ where: { id } });
    if (!item) throw new NotFoundException('Item urgente não encontrado');
    return this.prisma.produtoUrgente.delete({ where: { id } });
  }
}
