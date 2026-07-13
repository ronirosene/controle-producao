import { Controller, Get, Post, Put, Delete, Param, Body, UseGuards, Req, ParseIntPipe, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor } from '@nestjs/platform-express';
import { ServicosService } from './servicos.service';

@Controller('servicos')
@UseGuards(AuthGuard('jwt'))
export class ServicosController {
  constructor(private readonly service: ServicosService) {}

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Post('import')
  @UseInterceptors(FileInterceptor('file'))
  importFile(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('Nenhum arquivo enviado');
    return this.service.importFile(file.buffer, file.originalname);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { nome?: string; data_inicio?: string },
    @Req() req: any,
  ) {
    return this.service.update(id, { nome: body.nome, dataInicio: body.data_inicio }, req.user.email);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.service.remove(id, req.user.email);
  }
}
