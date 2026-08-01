import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    await this.$connect();
    await this.$executeRawUnsafe('PRAGMA journal_mode = WAL');
    await this.$executeRawUnsafe('PRAGMA busy_timeout = 5000');
    await this.$executeRawUnsafe('PRAGMA foreign_keys = ON');
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
