import { Module } from '@nestjs/common'
import { PrismaModule } from './prisma/prisma.module'
import { StorageModule } from './storage/storage.module'
import { UsersModule } from './users/users.module'
import { FilesModule } from './files/files.module'
import { PdfsModule } from './pdfs/pdfs.module'
import { AdminModule } from './admin/admin.module'

@Module({
  imports: [PrismaModule, StorageModule, UsersModule, FilesModule, PdfsModule, AdminModule],
})
export class AppModule {}
