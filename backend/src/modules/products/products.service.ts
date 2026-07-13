import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  async findAll(search?: string) {
    const where = search
      ? {
          OR: [
            { name: { contains: search } },
            { color: { contains: search } },
          ],
        }
      : {};
    return this.prisma.serviceProduct.findMany({ where, orderBy: { name: 'asc' } });
  }

  async findOne(id: string) {
    const product = await this.prisma.serviceProduct.findUnique({
      where: { id },
      include: { orderItems: { include: { serviceOrder: { include: { customer: true } } }, orderBy: { createdAt: 'desc' } } },
    });
    if (!product) throw new NotFoundException('Produto não encontrado');
    return product;
  }

  async create(dto: CreateProductDto) {
    return this.prisma.serviceProduct.create({ data: dto });
  }

  async update(id: string, dto: UpdateProductDto) {
    await this.findOne(id);
    return this.prisma.serviceProduct.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.serviceProduct.delete({ where: { id } });
  }
}
