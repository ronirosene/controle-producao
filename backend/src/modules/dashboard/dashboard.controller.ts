import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { DashboardService } from './dashboard.service';
import { RequireFeatures } from '../../common/auth.decorators';

@Controller('dashboard')
@UseGuards(AuthGuard('jwt'))
@RequireFeatures('PRODUCAO_DASHBOARD')
export class DashboardController {
  constructor(private readonly service: DashboardService) {}

  @Get()
  getStats() {
    return this.service.getStats();
  }
}
