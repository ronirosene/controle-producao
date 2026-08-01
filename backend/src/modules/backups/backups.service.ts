import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { readdir, stat } from 'fs/promises';
import { join } from 'path';

@Injectable()
export class BackupsService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    try {
      const directory = '/data/backups';
      const files = (await readdir(directory)).filter((file) => file.endsWith('.db')).sort().reverse();
      return Promise.all(files.map(async (filename, index) => {
        const info = await stat(join(directory, filename));
        return {
          id: index + 1,
          filename,
          filepath: join(directory, filename),
          size: info.size,
          createdAt: info.mtime.toISOString(),
        };
      }));
    } catch {
      return this.prisma.backup.findMany({ orderBy: { createdAt: 'desc' } });
    }
  }

  async create(data: { filename: string; filepath: string; size: number }) {
    return this.prisma.backup.create({ data });
  }
}
