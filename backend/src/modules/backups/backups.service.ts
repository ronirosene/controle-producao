import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';

@Injectable()
export class BackupsService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.backup.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async create(data: { filename: string; filepath: string; size: number }) {
    return this.prisma.backup.create({ data });
  }
}
