import {
  Controller, Get, Post, Put, Delete, Param, Body, Query, UseGuards, Req, ParseIntPipe,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ProdutosService } from './produtos.service';

@Controller('produtos')
@UseGuards(AuthGuard('jwt'))
export class ProdutosController {
  constructor(private readonly service: ProdutosService) {}

  @Post()
  create(@Body() body: any, @Req() req: any) {
    return this.service.create(body, req.user.email, req.user.userId);
  }

  @Put(':id/mover')
  mover(@Param('id', ParseIntPipe) id: number, @Body() body: any, @Req() req: any) {
    return this.service.mover(id, body, req.user.userId);
  }

  @Put(':id/editar')
  editar(@Param('id', ParseIntPipe) id: number, @Body() body: any, @Req() req: any) {
    return this.service.editar(id, body, req.user.email);
  }

  @Put(':id/estoque')
  toggleEstoque(@Param('id', ParseIntPipe) id: number) {
    return this.service.toggleEstoque(id);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.service.remove(id, req.user.email);
  }

  @Get('observacoes')
  getObservacoes(@Query('produto_id') produtoId?: string) {
    return this.service.getObservacoes(produtoId ? parseInt(produtoId) : undefined);
  }

  @Put('observacoes/:id')
  updateObservacao(@Param('id', ParseIntPipe) id: number, @Body('observacao') observacao: string) {
    return this.service.updateObservacao(id, observacao);
  }

  @Delete('observacoes/:id')
  removeObservacao(@Param('id', ParseIntPipe) id: number) {
    return this.service.removeObservacao(id);
  }

  @Get('relatorio')
  getRelatorio() {
    return this.service.getRelatorio();
  }

  @Get('dashboard')
  getDashboard() {
    return this.service.getDashboard();
  }

  @Get('posicao-atual')
  getPosicaoAtual() {
    return this.service.getPosicaoAtual();
  }
}
