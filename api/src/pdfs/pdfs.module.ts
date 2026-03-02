import { Module } from '@nestjs/common'
import { MulterModule } from '@nestjs/platform-express'
import { memoryStorage } from 'multer'
import { PdfsController } from './pdfs.controller'
import { ShareController } from './share.controller'
import { PdfsService } from './pdfs.service'

@Module({
  exports: [PdfsService],
  imports: [
    MulterModule.register({
      storage: memoryStorage(),
      limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
    }),
  ],
  controllers: [PdfsController, ShareController],
  providers: [PdfsService],
})
export class PdfsModule {}
