import { Module } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { AssistenciaRegistersService } from './assistencia-registers.service';
import { AssistenciaRegistersController } from './assistencia-registers.controller';

@Module({
  controllers: [AssistenciaRegistersController],
  providers: [AssistenciaRegistersService, PrismaService],
  exports: [AssistenciaRegistersService],
})
export class AssistenciaRegistersModule {}
