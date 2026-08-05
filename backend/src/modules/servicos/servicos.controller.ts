import { Controller, Get, Post, Put, Delete, Param, Body, UseGuards, Req, ParseIntPipe, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor } from '@nestjs/platform-express';
import { ServicosService } from './servicos.service';
import { RequireFeatures } from '../../common/auth.decorators';

@Controller('servicos')
@UseGuards(AuthGuard('jwt'))
@RequireFeatures('PRODUCAO_SERVICOS')
export class ServicosController {
  constructor(private readonly service: ServicosService) {}

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Post('import')
  @UseInterceptors(FileInterceptor('file', {
    limits: { fileSize: 5 * 1024 * 1024, files: 1 },
    fileFilter: (_request, file, callback) => {
      if (!/\.(xlsx|xls|csv)$/i.test(file.originalname)) {
        callback(new BadRequestException('Formato não suportado. Use XLSX, XLS ou CSV.'), false);
        return;
      }
      callback(null, true);
    },
  }))
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
