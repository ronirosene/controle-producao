import { Controller, Post, UseInterceptors, UploadedFiles, BadRequestException, Logger } from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { join } from 'path';
import { mkdir, unlink } from 'fs/promises';
import sharp from 'sharp';
import { randomUUID } from 'crypto';
import { RequireFeatures } from '../../common/auth.decorators';

// Keep Sharp predictable on small Fly.io machines. Image uploads are processed
// sequentially below, so extra worker threads and a large cache only waste RAM.
sharp.concurrency(1);
sharp.cache({ memory: 16, files: 0, items: 20 });

@Controller('upload')
@RequireFeatures('ASSISTENCIA_ORDENS')
export class UploadController {
  private readonly logger = new Logger(UploadController.name);

  @Post()
  @UseInterceptors(
    FilesInterceptor('files', 5, {
      storage: diskStorage({ destination: '/tmp' }),
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
      const name = randomUUID();
      const outputPath = join(uploadsDir, name + '.jpg');
      try {
        const metadata = await sharp(file.path, { limitInputPixels: 40_000_000 }).metadata();
        if (!metadata.format || !['jpeg', 'png', 'webp', 'heif', 'tiff'].includes(metadata.format)) {
          throw new Error('Formato real do arquivo não é uma imagem suportada');
        }
        await sharp(file.path, { limitInputPixels: 40_000_000 })
          .rotate()
          .resize({ width: 1920, height: 1920, fit: 'inside', withoutEnlargement: true })
          .jpeg({ quality: 78, mozjpeg: true })
          .toFile(outputPath);
      } catch (err: any) {
        this.logger.warn(`Imagem rejeitada pelo processador: ${err.message}`);
        throw new BadRequestException('Imagem inválida ou com resolução muito alta');
      } finally {
        await unlink(file.path).catch(() => undefined);
      }
      urls.push(`/uploads/${name}.jpg`);
    }

    return { urls };
  }
}
