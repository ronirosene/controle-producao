import { Controller, Get, Post, Delete, Body, Param, Req, UseGuards, ParseIntPipe } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { UrgentesService } from './urgentes.service';

@Controller('urgentes')
@UseGuards(AuthGuard('jwt'))
export class UrgentesController {
  constructor(private readonly service: UrgentesService) {}

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Post()
  create(@Body() body: { produto_id: number; data_despacho: string; observacao?: string }, @Req() req: any) {
    return this.service.create(body, req.user.userId);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}
