import { Controller, Post, UseInterceptors, UploadedFiles, BadRequestException, Logger } from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { join } from 'path';
import { mkdir, writeFile } from 'fs/promises';
import sharp from 'sharp';

@Controller('upload')
export class UploadController {
  private readonly logger = new Logger(UploadController.name);

  @Post()
  @UseInterceptors(
    FilesInterceptor('files', 10, {
      storage: memoryStorage(),
      limits: { fileSize: 10 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        if (!file.mimetype.match(/^image\//)) {
          cb(new BadRequestException('Apenas imagens são permitidas'), false);
          return;
        }
        cb(null, true);
      },
    }),
  )
  async uploadFiles(@UploadedFiles() files: Express.Multer.File[]) {
    if (!files || files.length === 0) throw new BadRequestException('Nenhum arquivo enviado');

    const uploadsDir = '/data/uploads';
    await mkdir(uploadsDir, { recursive: true });

    const urls: string[] = [];
    for (const file of files) {
      const name = Date.now() + '-' + Math.round(Math.random() * 1e9);
      const outputPath = join(uploadsDir, name + '.jpg');
      try {
        await sharp(file.buffer).jpeg({ quality: 80, mozjpeg: true }).toFile(outputPath);
      } catch (err: any) {
        this.logger.warn(`Sharp fallback, saving original: ${err.message}`);
        const ext = file.originalname?.includes('.') ? file.originalname.split('.').pop() : 'jpg';
        await writeFile(join(uploadsDir, name + '.' + ext), file.buffer);
        urls.push(`/uploads/${name}.${ext}`);
        continue;
      }
      urls.push(`/uploads/${name}.jpg`);
    }

    return { urls };
  }
}
