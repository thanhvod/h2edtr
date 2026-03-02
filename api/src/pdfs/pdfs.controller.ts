import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  BadRequestException,
  ParseIntPipe,
  StreamableFile,
} from '@nestjs/common'
import { PdfsService } from './pdfs.service'
import { DeviceIdGuard } from '../common/guards/device-id.guard'
import { DeviceId } from '../common/decorators/device-id.decorator'
import { AddPageDto } from './dto/add-page.dto'
import { AddPagesBatchDto } from './dto/add-pages-batch.dto'
import { AddThumbnailDto } from './dto/add-thumbnail.dto'
import { AddCapturedDto } from './dto/add-captured.dto'
import { PatchObjectsDto } from './dto/patch-objects.dto'
import { CreatePdfDto } from './dto/upload-pdf.dto'

@Controller('api/pdfs')
@UseGuards(DeviceIdGuard)
export class PdfsController {
  constructor(private readonly pdfsService: PdfsService) {}

  @Get()
  async list(@DeviceId() deviceId: string) {
    return this.pdfsService.list(deviceId)
  }

  @Post()
  async create(@DeviceId() deviceId: string, @Body() dto: CreatePdfDto) {
    return this.pdfsService.create(deviceId, dto.filename, dto.numPages, dto.fileSize)
  }

  @Get(':id')
  async findOne(@DeviceId() deviceId: string, @Param('id') id: string) {
    return this.pdfsService.findOne(deviceId, id)
  }

  @Post(':id/pages')
  async addPage(
    @DeviceId() deviceId: string,
    @Param('id') id: string,
    @Body() dto: AddPageDto,
  ) {
    return this.pdfsService.addPage(deviceId, id, {
      pageNumber: dto.pageNumber,
      imageBase64: dto.imageBase64,
      width: dto.width,
      height: dto.height,
    })
  }

  @Post(':id/pages/batch')
  async addPagesBatch(
    @DeviceId() deviceId: string,
    @Param('id') id: string,
    @Body() dto: AddPagesBatchDto,
  ) {
    return this.pdfsService.addPagesBatch(deviceId, id, dto.pages)
  }

  @Post(':id/thumbnail')
  async addThumbnail(
    @DeviceId() deviceId: string,
    @Param('id') id: string,
    @Body() dto: AddThumbnailDto,
  ) {
    return this.pdfsService.setThumbnail(deviceId, id, dto.thumbnailBase64)
  }

  @Get(':id/thumbnail')
  async getThumbnail(@DeviceId() deviceId: string, @Param('id') id: string) {
    return this.pdfsService.getThumbnail(deviceId, id)
  }

  @Get(':id/pages/:page')
  async getPage(
    @DeviceId() deviceId: string,
    @Param('id') id: string,
    @Param('page', ParseIntPipe) page: number,
  ) {
    if (page < 1) throw new BadRequestException('Page must be >= 1')
    return this.pdfsService.getPage(deviceId, id, page)
  }

  @Get(':id/objects')
  async getObjects(@DeviceId() deviceId: string, @Param('id') id: string) {
    return this.pdfsService.getObjects(deviceId, id)
  }

  @Post(':id/captured')
  async uploadCaptured(
    @DeviceId() deviceId: string,
    @Param('id') id: string,
    @Body() dto: AddCapturedDto,
  ) {
    return this.pdfsService.uploadCaptured(deviceId, id, dto.imageBase64)
  }

  @Get(':id/captured/:capturedId/download')
  async downloadCaptured(
    @DeviceId() deviceId: string,
    @Param('id') id: string,
    @Param('capturedId') capturedId: string,
  ) {
    const stream = await this.pdfsService.getCapturedStream(deviceId, id, capturedId)
    return new StreamableFile(stream, {
      type: 'image/png',
      disposition: `attachment; filename="captured-${capturedId}.png"`,
    })
  }

  @Get(':id/captured')
  async listCaptured(@DeviceId() deviceId: string, @Param('id') id: string) {
    return this.pdfsService.listCaptured(deviceId, id)
  }

  @Delete(':id/captured/:capturedId')
  async deleteCaptured(
    @DeviceId() deviceId: string,
    @Param('id') id: string,
    @Param('capturedId') capturedId: string,
  ) {
    return this.pdfsService.deleteCaptured(deviceId, id, capturedId)
  }

  @Patch(':id/objects')
  async patchObjects(
    @DeviceId() deviceId: string,
    @Param('id') id: string,
    @Body() dto: PatchObjectsDto,
  ) {
    return this.pdfsService.patchObjects(deviceId, id, {
      shapes: dto.shapes,
      pins: dto.pins,
      groups: dto.groups,
    })
  }
}
