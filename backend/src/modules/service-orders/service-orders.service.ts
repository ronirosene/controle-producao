import { Injectable, NotFoundException, InternalServerErrorException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { CreateServiceOrderDto, CreateServiceOrderItemDto } from './dto/create-service-order.dto';
import { UpdateServiceOrderDto, UpdateServiceOrderItemDto } from './dto/update-service-order.dto';
import { EmailService } from '../email/email.service';

@Injectable()
export class ServiceOrdersService {
  private readonly logger = new Logger(ServiceOrdersService.name);

  constructor(
    private prisma: PrismaService,
    private email: EmailService,
  ) {}

  async findAll(filters?: { status?: string; search?: string }) {
    const where: any = {};

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.search) {
      where.OR = [
        { customer: { name: { contains: filters.search } } },
      ];
    }

    return this.prisma.serviceOrder.findMany({
      where,
      include: {
        customer: true,
        items: { include: { product: true } },
      },
      orderBy: { pedido: 'desc' },
    });
  }

  async findOne(id: string) {
    const order = await this.prisma.serviceOrder.findUnique({
      where: { id },
      include: {
        customer: true,
        items: { include: { product: true } },
      },
    });
    if (!order) throw new NotFoundException('Ordem de serviço não encontrada');
    return order;
  }

  private async autoRegisterOrderData(dto: CreateServiceOrderDto | UpdateServiceOrderDto) {
    try {
      if ('customerName' in dto && dto.customerName) {
        const customer = await this.prisma.customer.findFirst({ where: { name: { equals: dto.customerName } } });
        if (customer?.representante) {
          await this.prisma.assistenciaRepresentante.upsert({
            where: { nome: customer.representante },
            create: { nome: customer.representante },
            update: {},
          });
        }
      }
      if (dto.items) {
        for (const item of dto.items) {
          if ('productColor' in item && item.productColor) {
            await this.prisma.assistenciaCor.upsert({
              where: { nome: item.productColor },
              create: { nome: item.productColor },
              update: {},
            });
          }
          if ('productFabric' in item && item.productFabric) {
            await this.prisma.assistenciaDetalhe.upsert({
              where: { nome: item.productFabric },
              create: { nome: item.productFabric },
              update: {},
            });
          }
        }
      }
    } catch (err) {
      this.logger.warn(`Auto-register failed: ${err.message}`);
    }
  }

  private async resolveProduct(dto: CreateServiceOrderItemDto | UpdateServiceOrderItemDto) {
    if (!('productName' in dto) || !dto.productName) return null;
    const existing = await this.prisma.serviceProduct.findFirst({
      where: { name: { equals: dto.productName } },
    });
    if (existing) return existing;
    return this.prisma.serviceProduct.create({
      data: {
        name: dto.productName,
        color: dto.productColor || null,
        fabric: dto.productFabric || null,
      },
    });
  }



  private async persistLog(type: string, desc: string, order: any, userName?: string) {
    await this.prisma.serviceOrderLog.create({
      data: { type, desc, pedido: order.pedido, orderId: order.id, customer: order.customer?.name || null, user: userName || '-' },
    });
  }

  async create(dto: CreateServiceOrderDto, userId?: number) {
    try {
      this.logger.log(`Creating order for customer: ${dto.customerName}, items: ${dto.items?.length}`);

      const customer = await this.prisma.customer.findFirst({
        where: { name: { equals: dto.customerName } },
      }) || await this.prisma.customer.create({
        data: { name: dto.customerName },
      });

      this.logger.log(`Customer resolved: ${customer.id}`);

      const order = await this.prisma.serviceOrder.create({
        data: {
          pedido: dto.pedido ?? null,
          customerId: customer.id,
          entryDate: dto.entryDate ? new Date(dto.entryDate) : new Date(),
          billingDate: dto.billingDate ? new Date(dto.billingDate) : null,
          notes: dto.notes || null,
          userId,
          items: {
            create: await Promise.all(dto.items.map(async (item) => {
              this.logger.log(`Resolving product: ${item.productName}`);
              const product = await this.resolveProduct(item);
              if (!product) {
                throw new Error(`Produto não encontrado/criado: ${item.productName}`);
              }
              return {
                productId: product.id,
                color: item.productColor || product.color || null,
                fabric: item.productFabric || product.fabric || null,
                quantity: item.quantity || 1,
                problemDesc: item.problemDesc,
                price: item.price ?? null,
                chargeable: item.chargeable ?? null,
                images: item.images || null,
              };
            })),
          },
        },
        include: {
          customer: true,
          items: { include: { product: true } },
        },
      });

      this.logger.log(`Order created: ${order.id}`);
      this.email.sendNewOrderNotification(order);
      this.autoRegisterOrderData(dto);
      const userName = userId ? (await this.prisma.user.findUnique({ where: { id: userId } }))?.name : undefined;
      await this.persistLog('ASSISTENCIA_CRIACAO', `Pedido #${order.pedido} criado — Cliente: ${order.customer.name}`, order, userName);
      return order;
    } catch (err: any) {
      const msg = err?.message || JSON.stringify(err);
      this.logger.error(`Failed to create order: ${msg}`, err?.stack);
      throw new InternalServerErrorException(msg);
    }
  }

  async update(id: string, dto: UpdateServiceOrderDto, userId?: number) {
    try {
      this.logger.log(`Updating order ${id}`);
      const existing = await this.findOne(id);

      const data: any = {};

      if (dto.pedido !== undefined) data.pedido = dto.pedido;
      if (dto.entryDate !== undefined) data.entryDate = new Date(dto.entryDate);
      if (dto.billingDate !== undefined) data.billingDate = new Date(dto.billingDate);
      if (dto.status !== undefined) data.status = dto.status;
      if (dto.notes !== undefined) data.notes = dto.notes;
      if (userId !== undefined) data.userId = userId;

      if (dto.customerName) {
        let customer = await this.prisma.customer.findFirst({
          where: { name: { equals: dto.customerName } },
        });
        if (!customer) {
          customer = await this.prisma.customer.create({
            data: { name: dto.customerName },
          });
        }
        data.customerId = customer.id;
      }

      if (dto.items) {
        for (const itemDto of dto.items) {
          if (itemDto._delete) {
            await this.prisma.serviceOrderItem.delete({ where: { id: itemDto._delete } });
            continue;
          }
          if (itemDto.id) {
            const updateData: any = {};
            if (itemDto.productName || itemDto.productColor || itemDto.productFabric) {
              if (itemDto.productName) {
                const product = await this.resolveProduct(itemDto);
                if (!product) throw new Error(`Produto não encontrado/criado: ${itemDto.productName}`);
                updateData.productId = product.id;
              }
              if (itemDto.productColor !== undefined) updateData.color = itemDto.productColor;
              if (itemDto.productFabric !== undefined) updateData.fabric = itemDto.productFabric;
            }
            if (itemDto.quantity !== undefined) updateData.quantity = itemDto.quantity;
            if (itemDto.problemDesc !== undefined) updateData.problemDesc = itemDto.problemDesc;
            if (itemDto.resolution !== undefined) updateData.resolution = itemDto.resolution;
            if (itemDto.price !== undefined) updateData.price = itemDto.price;
            if (itemDto.chargeable !== undefined) updateData.chargeable = itemDto.chargeable;
            if (itemDto.images !== undefined) updateData.images = itemDto.images;
            if (Object.keys(updateData).length > 0) {
              await this.prisma.serviceOrderItem.update({ where: { id: itemDto.id }, data: updateData });
            }
          } else {
            const product = await this.resolveProduct(itemDto);
            if (!product) throw new Error(`Produto não encontrado/criado: ${itemDto.productName || '(sem nome)'}`);
            await this.prisma.serviceOrderItem.create({
              data: {
                serviceOrderId: id,
                productId: product.id,
                color: itemDto.productColor || null,
                fabric: itemDto.productFabric || null,
                quantity: itemDto.quantity || 1,
                problemDesc: itemDto.problemDesc || '',
                images: itemDto.images || null,
              },
            });
          }
        }
      }

      const updated = await this.prisma.serviceOrder.update({
        where: { id },
        data,
        include: {
          customer: true,
          items: { include: { product: true } },
        },
      });

      const hadFinanceiroBefore = existing.items?.some(i => i.price != null);
      const hasFinanceiroNow = updated.items?.some(i => i.price != null);
      if (!hadFinanceiroBefore && hasFinanceiroNow) {
        this.email.sendFinanceiroUpdateNotification(updated);
      }

      const allChargeableHavePrice = updated.items
        .filter(i => i.chargeable === true)
        .every(i => i.price != null && i.price > 0);
      const hasChargeableItems = updated.items.some(i => i.chargeable === true);
      if (existing.status === 'AGUARDANDO_FINANCEIRO' && hasChargeableItems && allChargeableHavePrice) {
        await this.prisma.serviceOrder.update({
          where: { id },
          data: { status: 'AGUARDANDO_AUT_CLIENTE' },
        });
        updated.status = 'AGUARDANDO_AUT_CLIENTE';
      }

      this.autoRegisterOrderData(dto);
      const userName = userId ? (await this.prisma.user.findUnique({ where: { id: userId } }))?.name : undefined;

      const pedidoLabel = `#${updated.pedido || updated.id.slice(0, 8)}`;
      if (!hadFinanceiroBefore && hasFinanceiroNow) {
        for (const item of updated.items) {
          if (item.price != null) {
            await this.persistLog('FINANCEIRO_VALOR', `Pedido ${pedidoLabel} — Valor definido: R$ ${Number(item.price).toFixed(2)} (${item.product?.name || ''})`, updated, userName);
          }
        }
      }
      if (existing.status !== updated.status) {
        await this.persistLog('STATUS_ALTERADO', `Pedido ${pedidoLabel} — Status alterado: ${existing.status} → ${updated.status}`, updated, userName);
      }
      if (updated.servicoId && !existing.servicoId) {
        await this.persistLog('SERVICO_PRODUCAO', `Pedido ${pedidoLabel} — Serviço de produção vinculado (#${updated.servicoId})`, updated, userName);
      }

      return updated;
    } catch (err: any) {
      const msg = err?.message || JSON.stringify(err);
      this.logger.error(`Failed to update order ${id}: ${msg}`, err?.stack);
      throw new InternalServerErrorException(msg);
    }
  }

  async createProductionService(id: string, userId?: number) {
    try {
      this.logger.log(`Creating production service from order ${id}`);
      const order = await this.findOne(id);

      if (!order.items || order.items.length === 0) {
        throw new Error('Pedido sem produtos para criar serviço de produção');
      }

      const allNotChargeable = order.items.every(i => i.chargeable === false);
      if (!allNotChargeable && order.status !== 'AUTORIZADO_CLIENTE') {
        throw new Error('Ordem precisa estar autorizada pelo cliente para criar serviço de produção');
      }

      const pedidoLabel = order.pedido ? `#${order.pedido}` : `#${order.id.slice(0, 8)}`;
      const now = new Date().toISOString();

      const today = new Date().toISOString().split('T')[0];
      const servico = await this.prisma.servico.create({
        data: {
          nome: `Assistência - ${pedidoLabel}`,
          createdAt: now,
          dataInicio: today,
        },
      });

      this.logger.log(`Servico created: ${servico.id} - ${servico.nome}`);

      // Create a Produto for each item
      for (const item of order.items) {
        const produto = await this.prisma.produto.create({
          data: {
            servicoId: servico.id,
            nome: item.product?.name || item.problemDesc || 'Produto',
            cor: item.color || '',
            detalhe: item.fabric || '',
            qtdTotal: item.quantity || 1,
            observacao: `Pedido ${pedidoLabel} - ${item.problemDesc || ''}`.trim(),
            createdAt: now,
          },
        });

        // Create initial movimentacao at marcenaria
        await this.prisma.movimentacao.create({
          data: {
            produtoId: produto.id,
            setor: 'marcenaria',
            quantidade: item.quantity || 1,
            userId,
            createdAt: now,
          },
        });

        this.logger.log(`Produto created: ${produto.id} - ${produto.nome}`);
      }

      // Link the ServiceOrder to the Servico
      await this.prisma.serviceOrder.update({
        where: { id },
        data: { servicoId: servico.id },
      });

      this.logger.log(`ServiceOrder ${id} linked to Servico ${servico.id}`);

      return {
        servicoId: servico.id,
        message: `Serviço de produção ${servico.nome} criado com sucesso`,
      };
    } catch (err: any) {
      const msg = err?.message || JSON.stringify(err);
      this.logger.error(`Failed to create production service: ${msg}`, err?.stack);
      throw new InternalServerErrorException(msg);
    }
  }

  async remove(id: string, userId?: number) {
    try {
      const order = await this.findOne(id);
      const userName = userId ? (await this.prisma.user.findUnique({ where: { id: userId } }))?.name : undefined;
      await this.persistLog('ASSISTENCIA_EXCLUSAO', `Pedido #${order.pedido || order.id.slice(0, 8)} excluído — Cliente: ${order.customer?.name || ''}`, order, userName);
      return this.prisma.serviceOrder.delete({ where: { id } });
    } catch (err: any) {
      const msg = err?.message || JSON.stringify(err);
      this.logger.error(`Failed to remove order ${id}: ${msg}`, err?.stack);
      throw err instanceof NotFoundException ? err : new InternalServerErrorException(msg);
    }
  }
}
