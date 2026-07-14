import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';

@Injectable()
export class AssistenciaRegistersService {
  private readonly logger = new Logger(AssistenciaRegistersService.name);
  constructor(private prisma: PrismaService) {}

  async getLogs() {
    return this.prisma.serviceOrderLog.findMany({
      orderBy: { date: 'desc' },
      take: 500,
    });
  }

  async logCreate(order: any, userName?: string) {
    const pedidoLabel = order.pedido ? `#${order.pedido}` : `#${order.id.slice(0, 8)}`;
    await this.prisma.serviceOrderLog.create({
      data: {
        type: 'ASSISTENCIA_CRIACAO',
        desc: `Pedido ${pedidoLabel} criado — Cliente: ${order.customer?.name || ''}`,
        pedido: order.pedido,
        orderId: order.id,
        customer: order.customer?.name || null,
        user: userName || '-',
      },
    });
  }

  async logUpdate(oldOrder: any, newOrder: any, userName?: string) {
    const pedidoLabel = newOrder.pedido ? `#${newOrder.pedido}` : `#${newOrder.id.slice(0, 8)}`;

    const hadFinanceiro = oldOrder.items?.some((i: any) => i.price != null);
    const hasFinanceiro = newOrder.items?.some((i: any) => i.price != null);
    if (!hadFinanceiro && hasFinanceiro) {
      for (const item of newOrder.items) {
        if (item.price != null) {
          await this.prisma.serviceOrderLog.create({
            data: {
              type: 'FINANCEIRO_VALOR',
              desc: `Pedido ${pedidoLabel} — Valor definido: R$ ${Number(item.price).toFixed(2)} (${item.product?.name || ''})`,
              pedido: newOrder.pedido,
              orderId: newOrder.id,
              customer: newOrder.customer?.name || null,
              value: item.price,
              user: userName || '-',
            },
          });
        }
      }
    }

    if (newOrder.servicoId && !oldOrder.servicoId) {
      await this.prisma.serviceOrderLog.create({
        data: {
          type: 'SERVICO_PRODUCAO',
          desc: `Pedido ${pedidoLabel} — Serviço de produção vinculado (#${newOrder.servicoId})`,
          pedido: newOrder.pedido,
          orderId: newOrder.id,
          customer: newOrder.customer?.name || null,
          servicoId: newOrder.servicoId,
          user: userName || '-',
        },
      });
    }
  }

  async logDelete(order: any, userName?: string) {
    const pedidoLabel = order.pedido ? `#${order.pedido}` : `#${order.id.slice(0, 8)}`;
    await this.prisma.serviceOrderLog.create({
      data: {
        type: 'ASSISTENCIA_EXCLUSAO',
        desc: `Pedido ${pedidoLabel} excluído — Cliente: ${order.customer?.name || ''}`,
        pedido: order.pedido,
        orderId: order.id,
        customer: order.customer?.name || null,
        user: userName || '-',
      },
    });
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
