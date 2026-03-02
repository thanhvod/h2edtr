import { Module } from '@nestjs/common'
import { MulterModule } from '@nestjs/platform-express'
import { memoryStorage } from 'multer'
import { FilesController } from './files.controller'
import { FilesService } from './files.service'
import { PdfsModule } from '../pdfs/pdfs.module'

@Module({
  imports: [
    PdfsModule,
    MulterModule.register({
      storage: memoryStorage(),
      limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
    }),
  ],
  controllers: [FilesController],
  providers: [FilesService],
})
export class FilesModule {}
