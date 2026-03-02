import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  StreamableFile,
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { FilesService } from './files.service'
import { DeviceIdGuard } from '../common/guards/device-id.guard'
import { DeviceId } from '../common/decorators/device-id.decorator'
import { PatchStateDto } from './dto/patch-state.dto'

@Controller('api/files')
@UseGuards(DeviceIdGuard)
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Get()
  async list(@DeviceId() deviceId: string) {
    return this.filesService.list(deviceId)
  }

  @Post()
  @UseInterceptors(FileInterceptor('file'))
  async upload(
    @DeviceId() deviceId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('No file uploaded')
    if (file.mimetype !== 'application/pdf') {
      throw new BadRequestException('Only PDF files are allowed')
    }
    return this.filesService.create(deviceId, file)
  }

  @Get(':id/download')
  async download(@DeviceId() deviceId: string, @Param('id') id: string) {
    const stream = await this.filesService.getDownloadStream(deviceId, id)
    const file = await this.filesService.findOne(deviceId, id)
    return new StreamableFile(stream, {
      type: 'application/pdf',
      disposition: `attachment; filename="${encodeURIComponent(file.filename)}"`,
    })
  }

  @Get(':id/state')
  async getState(@DeviceId() deviceId: string, @Param('id') id: string) {
    return this.filesService.getState(deviceId, id)
  }

  @Get(':id')
  async findOne(@DeviceId() deviceId: string, @Param('id') id: string) {
    return this.filesService.findOne(deviceId, id)
  }

  @Delete(':id')
  async delete(@DeviceId() deviceId: string, @Param('id') id: string) {
    return this.filesService.delete(deviceId, id)
  }

  @Patch(':id/state')
  async patchState(
    @DeviceId() deviceId: string,
    @Param('id') id: string,
    @Body() dto: PatchStateDto,
  ) {
    return this.filesService.patchState(deviceId, id, {
      viewMode: dto.viewMode,
      zoom: dto.zoom,
      tool: dto.tool,
      drawShape: dto.drawShape,
      shapes: dto.shapes,
      pins: dto.pins,
      groups: dto.groups,
    })
  }
}
