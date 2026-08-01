import { Module } from '@nestjs/common';
import { UploadController } from './upload.controller';
import { UploadCleanupService } from './upload-cleanup.service';

@Module({
  controllers: [UploadController],
  providers: [UploadCleanupService],
})
export class UploadModule {}
