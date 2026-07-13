import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import * as bcrypt from 'bcryptjs';
import { ALL_FEATURES } from '../features';

const ALL_FEATURES_KEYS = ALL_FEATURES.map((f) => f.key);

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.user.findMany({
      select: { id: true, name: true, email: true, features: true, createdAt: true },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: number) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: { id: true, name: true, email: true, features: true, createdAt: true },
    });
    if (!user) throw new NotFoundException('Usuário não encontrado');
    return user;
  }

  async create(data: { name: string; email: string; password: string; features?: string[] }) {
    const existing = await this.prisma.user.findUnique({ where: { email: data.email.toLowerCase() } });
    if (existing) throw new ConflictException('Email já cadastrado');

    const passwordHash = await bcrypt.hash(data.password, 12);
    return this.prisma.user.create({
      data: {
        name: data.name,
        email: data.email.toLowerCase(),
        passwordHash,
        features: JSON.stringify(data.features || ALL_FEATURES_KEYS),
      },
      select: { id: true, name: true, email: true, features: true, createdAt: true },
    });
  }

  async update(id: number, data: { name?: string; email?: string; password?: string; features?: string[] }) {
    await this.findOne(id);
    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.email !== undefined) {
      const existing = await this.prisma.user.findUnique({ where: { email: data.email.toLowerCase() } });
      if (existing && existing.id !== id) throw new ConflictException('Email já cadastrado');
      updateData.email = data.email.toLowerCase();
    }
    if (data.password !== undefined && data.password.length > 0) {
      updateData.passwordHash = await bcrypt.hash(data.password, 12);
    }
    if (data.features !== undefined) {
      updateData.features = JSON.stringify(data.features);
    }
    return this.prisma.user.update({
      where: { id },
      data: updateData,
      select: { id: true, name: true, email: true, features: true, createdAt: true },
    });
  }

  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.user.delete({ where: { id } });
  }

  async fixAllFeatures() {
    const keys = JSON.stringify(ALL_FEATURES_KEYS);
    const result = await this.prisma.$executeRawUnsafe(
      `UPDATE users SET features = ? WHERE features IS NULL OR features = '' OR features = '[]'`,
      keys,
    );
    return { updated: result };
  }
}
