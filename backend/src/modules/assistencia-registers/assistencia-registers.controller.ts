import { Controller, Get, Post, Put, Delete, Param, Body, Query, ParseIntPipe } from '@nestjs/common';
import { AssistenciaRegistersService } from './assistencia-registers.service';

@Controller('assistencia')
export class AssistenciaRegistersController {
  constructor(private service: AssistenciaRegistersService) {}

  /* ── Representantes ── */

  @Get('representantes')
  findAllRepresentantes(@Query('search') search?: string) {
    return this.service.findAllRepresentantes(search);
  }

  @Post('representantes')
  createRepresentante(@Body() body: { nome: string }) {
    return this.service.createRepresentante(body.nome);
  }

  @Put('representantes/:id')
  updateRepresentante(@Param('id', ParseIntPipe) id: number, @Body() body: { nome: string }) {
    return this.service.updateRepresentante(id, body.nome);
  }

  @Delete('representantes/:id')
  deleteRepresentante(@Param('id', ParseIntPipe) id: number) {
    return this.service.deleteRepresentante(id);
  }

  /* ── Cores ── */

  @Get('cores')
  findAllCores(@Query('search') search?: string) {
    return this.service.findAllCores(search);
  }

  @Post('cores')
  createCor(@Body() body: { nome: string }) {
    return this.service.createCor(body.nome);
  }

  @Put('cores/:id')
  updateCor(@Param('id', ParseIntPipe) id: number, @Body() body: { nome: string }) {
    return this.service.updateCor(id, body.nome);
  }

  @Delete('cores/:id')
  deleteCor(@Param('id', ParseIntPipe) id: number) {
    return this.service.deleteCor(id);
  }

  /* ── Detalhes ── */

  @Get('detalhes')
  findAllDetalhes(@Query('search') search?: string) {
    return this.service.findAllDetalhes(search);
  }

  @Post('detalhes')
  createDetalhe(@Body() body: { nome: string }) {
    return this.service.createDetalhe(body.nome);
  }

  @Put('detalhes/:id')
  updateDetalhe(@Param('id', ParseIntPipe) id: number, @Body() body: { nome: string }) {
    return this.service.updateDetalhe(id, body.nome);
  }

  @Delete('detalhes/:id')
  deleteDetalhe(@Param('id', ParseIntPipe) id: number) {
    return this.service.deleteDetalhe(id);
  }

  /* ── Logs ── */

  @Get('logs')
  getLogs() {
    return this.service.getLogs();
  }
}
