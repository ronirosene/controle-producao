import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { readdir, stat, unlink } from 'fs/promises';
import { join } from 'path';
import { PrismaService } from '../../prisma.service';

@Injectable()
export class UploadCleanupService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(UploadCleanupService.name);
  private timer?: NodeJS.Timeout;

  constructor(private readonly prisma: PrismaService) {}

  onModuleInit() {
    this.timer = setInterval(() => void this.removeOrphans(), 24 * 60 * 60 * 1000);
    this.timer.unref();
    setTimeout(() => void this.removeOrphans(), 60_000).unref();
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  async removeOrphans() {
    const directory = '/data/uploads';
    try {
      const items = await this.prisma.serviceOrderItem.findMany({ select: { images: true } });
      const referenced = new Set<string>();
      for (const item of items) {
        if (!item.images) continue;
        try {
          for (const url of JSON.parse(item.images)) referenced.add(String(url).split('/').pop()!);
        } catch { /* ignore legacy invalid JSON */ }
      }

      const now = Date.now();
      for (const file of await readdir(directory)) {
        if (referenced.has(file)) continue;
        const filePath = join(directory, file);
        const info = await stat(filePath);
        if (now - info.mtimeMs > 24 * 60 * 60 * 1000) await unlink(filePath);
      }
    } catch (error: any) {
      this.logger.warn(`Falha na limpeza de imagens órfãs: ${error.message}`);
    }
  }
}
