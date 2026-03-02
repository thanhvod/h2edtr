import { Controller, Get, Param, ParseIntPipe, BadRequestException } from '@nestjs/common'
import { PdfsService } from './pdfs.service'

@Controller('api/share')
export class ShareController {
  constructor(private readonly pdfsService: PdfsService) {}

  @Get(':id')
  async getShareData(@Param('id') id: string) {
    return this.pdfsService.getShareData(id)
  }

  @Get(':id/pages/:page')
  async getSharePage(
    @Param('id') id: string,
    @Param('page', ParseIntPipe) page: number,
  ) {
    if (page < 1) throw new BadRequestException('Page must be >= 1')
    return this.pdfsService.getSharePage(id, page)
  }
}
