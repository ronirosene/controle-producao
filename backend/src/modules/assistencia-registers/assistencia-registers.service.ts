import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';

@Injectable()
export class AssistenciaRegistersService {
  private readonly logger = new Logger(AssistenciaRegistersService.name);
  constructor(private prisma: PrismaService) {}

  async getLogs() {
    const orders = await this.prisma.serviceOrder.findMany({
      include: {
        customer: true,
        items: { include: { product: true } },
      },
      orderBy: { updatedAt: 'desc' },
      take: 200,
    });

    const logs: any[] = [];

    for (const order of orders) {
      const pedidoLabel = order.pedido ? `#${order.pedido}` : `#${order.id.slice(0, 8)}`;

      logs.push({
        type: 'ASSISTENCIA_CRIACAO',
        date: order.createdAt,
        desc: `Pedido ${pedidoLabel} criado — Cliente: ${order.customer.name}`,
        pedido: order.pedido,
        orderId: order.id,
        customer: order.customer.name,
        status: order.status,
      });

      for (const item of order.items) {
        if (item.price != null) {
          logs.push({
            type: 'FINANCEIRO_VALOR',
            date: order.updatedAt,
            desc: `Pedido ${pedidoLabel} — Valor definido: R$ ${Number(item.price).toFixed(2)} (${item.product?.name || ''})`,
            pedido: order.pedido,
            orderId: order.id,
            customer: order.customer.name,
            value: item.price,
          });
        }
      }

      if (order.servicoId) {
        logs.push({
          type: 'SERVICO_PRODUCAO',
          date: order.updatedAt,
          desc: `Pedido ${pedidoLabel} — Serviço de produção vinculado (#${order.servicoId})`,
          pedido: order.pedido,
          orderId: order.id,
          customer: order.customer.name,
          servicoId: order.servicoId,
        });
      }
    }

    logs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return logs.slice(0, 500);
  }

  async findAllRepresentantes(search?: string) {
    const where: any = {};
    if (search) where.nome = { contains: search };
    return this.prisma.assistenciaRepresentante.findMany({ where, orderBy: { nome: 'asc' } });
  }

  async createRepresentante(nome: string) {
    const existing = await this.prisma.assistenciaRepresentante.findUnique({ where: { nome } });
    if (existing) return existing;
    return this.prisma.assistenciaRepresentante.create({ data: { nome } });
  }

  async updateRepresentante(id: number, nome: string) {
    return this.prisma.assistenciaRepresentante.update({ where: { id }, data: { nome } });
  }

  async deleteRepresentante(id: number) {
    return this.prisma.assistenciaRepresentante.delete({ where: { id } });
  }

  async findAllCores(search?: string) {
    const where: any = {};
    if (search) where.nome = { contains: search };
    return this.prisma.assistenciaCor.findMany({ where, orderBy: { nome: 'asc' } });
  }

  async createCor(nome: string) {
    const existing = await this.prisma.assistenciaCor.findUnique({ where: { nome } });
    if (existing) return existing;
    return this.prisma.assistenciaCor.create({ data: { nome } });
  }

  async updateCor(id: number, nome: string) {
    return this.prisma.assistenciaCor.update({ where: { id }, data: { nome } });
  }

  async deleteCor(id: number) {
    return this.prisma.assistenciaCor.delete({ where: { id } });
  }

  async findAllDetalhes(search?: string) {
    const where: any = {};
    if (search) where.nome = { contains: search };
    return this.prisma.assistenciaDetalhe.findMany({ where, orderBy: { nome: 'asc' } });
  }

  async createDetalhe(nome: string) {
    const existing = await this.prisma.assistenciaDetalhe.findUnique({ where: { nome } });
    if (existing) return existing;
    return this.prisma.assistenciaDetalhe.create({ data: { nome } });
  }

  async updateDetalhe(id: number, nome: string) {
    return this.prisma.assistenciaDetalhe.update({ where: { id }, data: { nome } });
  }

  async deleteDetalhe(id: number) {
    return this.prisma.assistenciaDetalhe.delete({ where: { id } });
  }
}
