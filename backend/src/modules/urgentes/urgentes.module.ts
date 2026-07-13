import { Module } from '@nestjs/common';
import { UrgentesController } from './urgentes.controller';
import { UrgentesService } from './urgentes.service';

@Module({
  controllers: [UrgentesController],
  providers: [UrgentesService],
})
export class UrgentesModule {}
