import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { BackupsService } from './backups.service';
import { RequireFeatures } from '../../common/auth.decorators';

@Controller('backups')
@UseGuards(AuthGuard('jwt'))
@RequireFeatures('ADMIN_USUARIOS')
export class BackupsController {
  constructor(private readonly service: BackupsService) {}

  @Get()
  findAll() {
    return this.service.findAll();
  }
}
