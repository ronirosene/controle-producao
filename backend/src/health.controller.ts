import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { Public } from './common/auth.decorators';
import { statfs } from 'fs/promises';
import { freemem } from 'os';

@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @Public()
  async health() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      const disk = await statfs('/data').catch(() => null);
      return {
        status: 'ok',
        database: 'ok',
        memoryFreeMb: Math.round(freemem() / 1024 / 1024),
        diskFreeMb: disk ? Math.round(Number(disk.bavail * disk.bsize) / 1024 / 1024) : null,
        timestamp: new Date().toISOString(),
      };
    } catch {
      throw new ServiceUnavailableException({ status: 'error', database: 'unavailable' });
    }
  }
}
