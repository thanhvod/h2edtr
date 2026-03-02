import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { Prisma } from '@prisma/client'
import { PdfsService } from '../pdfs/pdfs.service'
import { S3Service } from '../storage/s3.service'
import { idToS3Key } from '../storage/id-to-s3-key'
import type { PatchObjectsDto } from '../pdfs/dto/patch-objects.dto'
import type { Readable } from 'stream'

@Injectable()
export class FilesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pdfsService: PdfsService,
    private readonly s3: S3Service,
  ) {}

  async ensureUser(deviceId: string) {
    const user = await this.prisma.user.findUnique({
      where: { deviceId },
    })
    if (!user) {
      throw new ForbiddenException('User not found. Call POST /api/users/ensure first.')
    }
    return user
  }

  async list(deviceId: string) {
    const user = await this.ensureUser(deviceId)
    const files = await this.prisma.pdfFile.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        filename: true,
        fileSize: true,
        numPages: true,
        createdAt: true,
      },
    })
    return files.map((f) => ({
      id: f.id,
      filename: f.filename,
      fileSize: f.fileSize ? Number(f.fileSize) : null,
      numPages: f.numPages,
      createdAt: f.createdAt,
    }))
  }

  async create(deviceId: string, file: Express.Multer.File) {
    const user = await this.ensureUser(deviceId)
    const fileId = crypto.randomUUID()

    const created = await this.prisma.pdfFile.create({
      data: {
        id: fileId,
        userId: user.id,
        filename: file.originalname,
        fileSize: BigInt(file.size),
      },
    })

    const key = idToS3Key(created.sequenceId, 'pdf')
    await this.s3.upload(key, file.buffer, 'application/pdf')

    await this.prisma.pdfState.create({
      data: {
        pdfFileId: created.id,
      },
    })

    return {
      id: created.id,
      filename: created.filename,
      createdAt: created.createdAt,
    }
  }

  async findOne(deviceId: string, id: string) {
    const user = await this.ensureUser(deviceId)
    const file = await this.prisma.pdfFile.findFirst({
      where: { id, userId: user.id },
    })
    if (!file) throw new NotFoundException('File not found')
    return {
      id: file.id,
      filename: file.filename,
      fileSize: file.fileSize ? Number(file.fileSize) : null,
      numPages: file.numPages,
      createdAt: file.createdAt,
    }
  }

  async getDownloadStream(deviceId: string, id: string): Promise<Readable> {
    const user = await this.ensureUser(deviceId)
    const file = await this.prisma.pdfFile.findFirst({
      where: { id, userId: user.id },
    })
    if (!file) throw new NotFoundException('File not found')
    const key = idToS3Key(file.sequenceId, 'pdf')
    try {
      return await this.s3.getStream(key)
    } catch (err) {
      const name = err instanceof Error ? err.name : ''
      const code = (err as { Code?: string }).Code
      const msg = err instanceof Error ? err.message : String(err)
      if (
        name === 'NoSuchKey' ||
        code === 'NoSuchKey' ||
        msg?.includes('does not exist')
      ) {
        throw new NotFoundException('PDF file not found in storage')
      }
      throw err
    }
  }

  async delete(deviceId: string, id: string) {
    const user = await this.ensureUser(deviceId)
    const file = await this.prisma.pdfFile.findFirst({
      where: { id, userId: user.id },
      include: { pageImages: true },
    })
    if (!file) throw new NotFoundException('File not found')

    const pdfKey = idToS3Key(file.sequenceId, 'pdf')
    try {
      await this.s3.delete(pdfKey)
    } catch {
      // ignore if already deleted
    }

    for (const page of file.pageImages) {
      const imgKey = idToS3Key(page.sequenceId, 'image')
      try {
        await this.s3.delete(imgKey)
      } catch {
        // ignore
      }
    }

    await this.prisma.pdfFile.delete({ where: { id } })
    return { deleted: true }
  }

  async getState(deviceId: string, id: string) {
    const user = await this.ensureUser(deviceId)
    const file = await this.prisma.pdfFile.findFirst({
      where: { id, userId: user.id },
      include: { state: true },
    })
    if (!file) throw new NotFoundException('File not found')

    const objects = await this.pdfsService.getObjects(deviceId, id)
    const state = file.state

    return {
      viewMode: state?.viewMode ?? 'scroll',
      zoom: state ? Number(state.zoom) : 1,
      tool: state?.tool ?? 'select',
      drawShape: state?.drawShape ?? 'rect',
      shapes: objects.shapes,
      pins: objects.pins,
      groups: objects.groups,
    }
  }

  async patchState(
    deviceId: string,
    id: string,
    data: {
      viewMode?: string
      zoom?: number
      tool?: string
      drawShape?: string
      shapes?: unknown[]
      pins?: unknown[]
      groups?: unknown[]
    },
  ) {
    const user = await this.ensureUser(deviceId)
    const file = await this.prisma.pdfFile.findFirst({
      where: { id, userId: user.id },
      include: { state: true },
    })
    if (!file) throw new NotFoundException('File not found')

    const stateUpdate: Prisma.PdfStateUpdateInput = {}
    if (data.viewMode != null) stateUpdate.viewMode = data.viewMode
    if (data.zoom != null) stateUpdate.zoom = data.zoom
    if (data.tool != null) stateUpdate.tool = data.tool
    if (data.drawShape != null) stateUpdate.drawShape = data.drawShape

    if (file.state) {
      await this.prisma.pdfState.update({
        where: { id: file.state.id },
        data: stateUpdate,
      })
    } else {
      await this.prisma.pdfState.create({
        data: {
          pdfFileId: file.id,
          viewMode: data.viewMode ?? 'scroll',
          zoom: data.zoom ?? 1,
          tool: data.tool ?? 'select',
          drawShape: data.drawShape ?? 'rect',
        },
      })
    }

    if (data.shapes != null || data.pins != null || data.groups != null) {
      await this.pdfsService.patchObjects(deviceId, id, {
        shapes: data.shapes as PatchObjectsDto['shapes'],
        pins: data.pins as PatchObjectsDto['pins'],
        groups: data.groups as PatchObjectsDto['groups'],
      })
    }

    return this.getState(deviceId, id)
  }
}
