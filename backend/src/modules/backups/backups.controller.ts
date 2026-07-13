import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { BackupsService } from './backups.service';

@Controller('backups')
@UseGuards(AuthGuard('jwt'))
export class BackupsController {
  constructor(private readonly service: BackupsService) {}

  @Get()
  findAll() {
    return this.service.findAll();
  }
}
