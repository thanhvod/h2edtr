import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { S3Service } from '../storage/s3.service'
import { idToS3Key } from '../storage/id-to-s3-key'
import * as sharp from 'sharp'

@Injectable()
export class PdfsService {
  constructor(
    private readonly prisma: PrismaService,
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
        thumbnailBase64: true,
        createdAt: true,
      },
    })
    return files.map((f) => ({
      id: f.id,
      filename: f.filename,
      fileSize: f.fileSize ? Number(f.fileSize) : null,
      numPages: f.numPages,
      thumbnailBase64: f.thumbnailBase64,
      createdAt: f.createdAt,
    }))
  }

  async create(deviceId: string, filename: string, numPages: number, fileSize?: number) {
    const user = await this.ensureUser(deviceId)
    const fileId = crypto.randomUUID()

    const created = await this.prisma.pdfFile.create({
      data: {
        id: fileId,
        userId: user.id,
        filename,
        numPages,
        fileSize: fileSize != null ? BigInt(fileSize) : null,
      },
    })

    await this.prisma.pdfState.create({
      data: {
        pdfFileId: created.id,
      },
    })

    return {
      id: created.id,
      numPages: created.numPages,
      filename: created.filename,
      createdAt: created.createdAt,
    }
  }

  async findOne(deviceId: string, id: string) {
    const user = await this.ensureUser(deviceId)
    const file = await this.prisma.pdfFile.findFirst({
      where: { id, userId: user.id },
      select: {
        id: true,
        filename: true,
        fileSize: true,
        numPages: true,
        thumbnailBase64: true,
        createdAt: true,
      },
    })
    if (!file) throw new NotFoundException('PDF not found')
    return {
      id: file.id,
      filename: file.filename,
      fileSize: file.fileSize ? Number(file.fileSize) : null,
      numPages: file.numPages,
      thumbnailBase64: file.thumbnailBase64,
      createdAt: file.createdAt,
    }
  }

  async setThumbnail(deviceId: string, pdfId: string, thumbnailBase64: string) {
    const user = await this.ensureUser(deviceId)
    const file = await this.prisma.pdfFile.findFirst({
      where: { id: pdfId, userId: user.id },
    })
    if (!file) throw new NotFoundException('PDF not found')

    const jpgBuffer = await this.base64ToJpgBuffer(thumbnailBase64)
    const key = idToS3Key(file.sequenceId, 'thumbnail')
    await this.s3.upload(key, jpgBuffer, 'image/jpeg')

    await this.prisma.pdfFile.update({
      where: { id: pdfId },
      data: { thumbnailBase64: null },
    })
    return { ok: true }
  }

  private static readonly DEFAULT_THUMBNAIL_KEY = 'defaults/pdf-placeholder-red.png'

  async getThumbnail(deviceId: string, pdfId: string) {
    const user = await this.ensureUser(deviceId)
    const file = await this.prisma.pdfFile.findFirst({
      where: { id: pdfId, userId: user.id },
    })
    if (!file) throw new NotFoundException('PDF not found')
    if (file.thumbnailBase64) {
      return { url: `data:image/jpeg;base64,${file.thumbnailBase64}` }
    }
    const key = idToS3Key(file.sequenceId, 'thumbnail')
    const hasThumbnail = await this.s3.exists(key)
    const url = await this.s3.getSignedUrl(
      hasThumbnail ? key : PdfsService.DEFAULT_THUMBNAIL_KEY,
      3600,
    )
    return { url }
  }

  private async base64ToJpgBuffer(base64: string): Promise<Buffer> {
    const buf = Buffer.from(base64, 'base64')
    return sharp(buf).jpeg({ quality: 90 }).toBuffer()
  }

  async addPage(
    deviceId: string,
    pdfId: string,
    data: { pageNumber: number; imageBase64: string; width: number; height: number },
  ) {
    const user = await this.ensureUser(deviceId)
    const file = await this.prisma.pdfFile.findFirst({
      where: { id: pdfId, userId: user.id },
    })
    if (!file) throw new NotFoundException('PDF not found')

    const page = await this.prisma.pdfPageImage.upsert({
      where: {
        pdfFileId_pageNumber: { pdfFileId: pdfId, pageNumber: data.pageNumber },
      },
      create: {
        pdfFileId: pdfId,
        pageNumber: data.pageNumber,
        width: data.width,
        height: data.height,
      },
      update: {
        width: data.width,
        height: data.height,
      },
    })

    const jpgBuffer = await this.base64ToJpgBuffer(data.imageBase64)
    const key = idToS3Key(page.sequenceId, 'image')
    await this.s3.upload(key, jpgBuffer, 'image/jpeg')

    return { pageNumber: data.pageNumber }
  }

  async addPagesBatch(
    deviceId: string,
    pdfId: string,
    pages: Array<{ pageNumber: number; imageBase64: string; width: number; height: number }>,
  ) {
    const user = await this.ensureUser(deviceId)
    const file = await this.prisma.pdfFile.findFirst({
      where: { id: pdfId, userId: user.id },
    })
    if (!file) throw new NotFoundException('PDF not found')

    for (const p of pages) {
      const page = await this.prisma.pdfPageImage.upsert({
        where: {
          pdfFileId_pageNumber: { pdfFileId: pdfId, pageNumber: p.pageNumber },
        },
        create: {
          pdfFileId: pdfId,
          pageNumber: p.pageNumber,
          width: p.width,
          height: p.height,
        },
        update: {
          width: p.width,
          height: p.height,
        },
      })
      const jpgBuffer = await this.base64ToJpgBuffer(p.imageBase64)
      const key = idToS3Key(page.sequenceId, 'image')
      await this.s3.upload(key, jpgBuffer, 'image/jpeg')
    }
    return { count: pages.length }
  }

  async getPage(deviceId: string, pdfId: string, pageNumber: number) {
    const user = await this.ensureUser(deviceId)
    const file = await this.prisma.pdfFile.findFirst({
      where: { id: pdfId, userId: user.id },
    })
    if (!file) throw new NotFoundException('PDF not found')

    const page = await this.prisma.pdfPageImage.findUnique({
      where: {
        pdfFileId_pageNumber: { pdfFileId: pdfId, pageNumber },
      },
    })
    if (!page) throw new NotFoundException('Page not found')

    const key = idToS3Key(page.sequenceId, 'image')
    const url = await this.s3.getSignedUrl(key, 3600)

    return {
      url,
      width: page.width,
      height: page.height,
    }
  }

  private getPageNumberFromY(y: number): number {
    const PAGE_HEIGHT = 842 * 1.5
    const GAP = 16
    const pageHeightWithGap = PAGE_HEIGHT + GAP
    return Math.max(1, Math.floor(y / pageHeightWithGap) + 1)
  }

  /** Public share: get PDF metadata + objects by id (no auth). */
  async getShareData(pdfId: string) {
    const file = await this.prisma.pdfFile.findUnique({
      where: { id: pdfId },
      select: { id: true, numPages: true },
    })
    if (!file) throw new NotFoundException('PDF not found')
    const objects = await this.getObjectsInternal(pdfId)
    return { numPages: file.numPages, ...objects }
  }

  /** Public share: get page image URL by pdfId (no auth). */
  async getSharePage(pdfId: string, pageNumber: number) {
    const file = await this.prisma.pdfFile.findUnique({
      where: { id: pdfId },
    })
    if (!file) throw new NotFoundException('PDF not found')
    const page = await this.prisma.pdfPageImage.findUnique({
      where: {
        pdfFileId_pageNumber: { pdfFileId: pdfId, pageNumber },
      },
    })
    if (!page) throw new NotFoundException('Page not found')
    const key = idToS3Key(page.sequenceId, 'image')
    const url = await this.s3.getSignedUrl(key, 3600)
    return { url, width: page.width, height: page.height }
  }

  private async getObjectsInternal(pdfId: string) {
    const [shapes, pins, groupsDb] = await Promise.all([
      this.prisma.pdfShape.findMany({
        where: { pdfFileId: pdfId },
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.pdfPin.findMany({
        where: { pdfFileId: pdfId },
      }),
      this.prisma.pdfGroup.findMany({
        where: { pdfFileId: pdfId },
        include: { groupShapes: { include: { shape: true } } },
      }),
    ])

    const shapeIdsInGroups = new Set<string>()
    for (const g of groupsDb) {
      for (const gs of g.groupShapes) {
        shapeIdsInGroups.add(gs.shapeId)
      }
    }

    const freeShapes = shapes
      .filter((s) => !shapeIdsInGroups.has(s.id))
      .map((s) => {
        const base = { id: s.id, type: s.type, x: s.x, y: s.y }
        if (s.type === 'rect') {
          return { ...base, width: s.width, height: s.height, borderWidth: s.borderWidth, radius: s.radiusCorner, color: s.color }
        }
        return { ...base, radius: s.radius }
      })

    const groups = groupsDb.map((g) => {
      const shapesRecord: Record<string, unknown> = {}
      for (const gs of g.groupShapes) {
        const s = gs.shape
        if (s.type === 'rect') {
          shapesRecord[s.id] = {
            type: s.type,
            localX: gs.localX,
            localY: gs.localY,
            width: s.width,
            height: s.height,
            borderWidth: s.borderWidth,
            radius: s.radiusCorner,
            color: s.color,
          }
        } else {
          shapesRecord[s.id] = {
            type: s.type,
            localX: gs.localX,
            localY: gs.localY,
            radius: s.radius,
          }
        }
      }
      return {
        id: g.id,
        pinId: g.pinId,
        pinX: g.pinX,
        pinY: g.pinY,
        shapeIds: g.groupShapes.map((gs) => gs.shapeId),
        shapes: shapesRecord,
      }
    })

    return {
      shapes: freeShapes,
      pins: pins.map((p) => ({ id: p.id, x: p.x, y: p.y })),
      groups,
    }
  }

  async getObjects(deviceId: string, pdfId: string) {
    const user = await this.ensureUser(deviceId)
    const file = await this.prisma.pdfFile.findFirst({
      where: { id: pdfId, userId: user.id },
    })
    if (!file) throw new NotFoundException('PDF not found')
    return this.getObjectsInternal(pdfId)
  }

  async patchObjects(
    deviceId: string,
    pdfId: string,
    data: {
      shapes?: Array<{
        id?: string
        type: string
        x: number
        y: number
        width?: number
        height?: number
        radius?: number
        color?: string
        borderWidth?: number
      }>
      pins?: Array<{ id?: string; x: number; y: number }>
      groups?: Array<{
        id?: string
        pinId: string
        pinX: number
        pinY: number
        shapeIds: string[]
        shapes: Record<
          string,
          {
            type: string
            localX: number
            localY: number
            width?: number
            height?: number
            radius?: number
            color?: string
            borderWidth?: number
          }
        >
      }>
    },
  ) {
    const user = await this.ensureUser(deviceId)
    const file = await this.prisma.pdfFile.findFirst({
      where: { id: pdfId, userId: user.id },
    })
    if (!file) throw new NotFoundException('PDF not found')

    await this.prisma.$transaction(async (tx) => {
      await tx.pdfGroupShape.deleteMany({
        where: { group: { pdfFileId: pdfId } },
      })
      await tx.pdfGroup.deleteMany({ where: { pdfFileId: pdfId } })
      await tx.pdfShape.deleteMany({ where: { pdfFileId: pdfId } })
      await tx.pdfPin.deleteMany({ where: { pdfFileId: pdfId } })

      const pins = data.pins ?? []
      const shapes = data.shapes ?? []
      const groups = data.groups ?? []

      const ensureId = (val: string | undefined): string =>
        val && String(val).trim() ? val : crypto.randomUUID()

      // Always use new UUIDs for pins - client ids may collide with other PDFs in DB
      const pinIdMap = new Map<string, string>()
      const createdPins: Array<{ id: string; x: number; y: number }> = []
      for (let i = 0; i < pins.length; i++) {
        const p = pins[i]
        const newId = crypto.randomUUID()
        const clientKey = (p.id && String(p.id).trim()) ? p.id : `__idx_${i}`
        pinIdMap.set(clientKey, newId)
        createdPins.push({ id: newId, x: p.x, y: p.y })
        await tx.pdfPin.create({
          data: {
            id: newId,
            pdfFileId: pdfId,
            x: p.x,
            y: p.y,
          },
        })
      }

      // Always use new UUIDs for shapes - client ids may collide with other PDFs in DB
      const shapeIdMap = new Map<string, string>()
      for (let i = 0; i < shapes.length; i++) {
        const s = shapes[i]
        const newId = crypto.randomUUID()
        const clientKey = (s.id && String(s.id).trim()) ? s.id : `__idx_${i}`
        shapeIdMap.set(clientKey, newId)
        const pageNum = this.getPageNumberFromY(s.y)
        await tx.pdfShape.create({
          data: {
            id: newId,
            pdfFileId: pdfId,
            pageNumber: pageNum,
            type: s.type,
            x: s.x,
            y: s.y,
            width: s.width,
            height: s.height,
            radius: s.type !== 'rect' ? s.radius : undefined,
            radiusCorner: s.type === 'rect' ? s.radius : undefined,
            color: s.color,
            borderWidth: s.borderWidth,
          },
        })
      }

      for (const g of groups) {
        const groupId = crypto.randomUUID()
        let resolvedPinId = (g.pinId && String(g.pinId).trim())
          ? pinIdMap.get(g.pinId)
          : null
        if (!resolvedPinId) {
          const pinByPos = createdPins.find(
            (p) => Math.abs(p.x - g.pinX) < 0.001 && Math.abs(p.y - g.pinY) < 0.001,
          )
          resolvedPinId = pinByPos?.id ?? crypto.randomUUID()
        }
        const pin =
          createdPins.find((p) => p.id === resolvedPinId) ?? {
            x: g.pinX,
            y: g.pinY,
          }
        await tx.pdfGroup.create({
          data: {
            id: groupId,
            pdfFileId: pdfId,
            pinId: resolvedPinId,
            pinX: pin.x,
            pinY: pin.y,
          },
        })

        for (const shapeId of g.shapeIds) {
          const shapeData = g.shapes[shapeId]
          if (!shapeData) continue

          const freeShape = shapes.find((s) => (s.id ?? '') === shapeId)
          const shapeType = freeShape?.type ?? shapeData.type
          const shapeWidth = freeShape?.width ?? shapeData.width
          const shapeHeight = freeShape?.height ?? shapeData.height
          const shapeRadius = freeShape?.radius ?? shapeData.radius
          const shapeColor = freeShape?.color ?? shapeData.color
          const shapeBorderWidth = freeShape?.borderWidth ?? shapeData.borderWidth

          let resolvedShapeId = shapeIdMap.get(shapeId)
          if (!resolvedShapeId) {
            resolvedShapeId = crypto.randomUUID()
            shapeIdMap.set(shapeId, resolvedShapeId)
            const pageNum = this.getPageNumberFromY(pin.y + shapeData.localY)
            await tx.pdfShape.create({
              data: {
                id: resolvedShapeId,
                pdfFileId: pdfId,
                pageNumber: pageNum,
                type: shapeType,
                x: pin.x + shapeData.localX,
                y: pin.y + shapeData.localY,
                width: shapeWidth,
                height: shapeHeight,
                radius: shapeType !== 'rect' ? shapeRadius : undefined,
                radiusCorner: shapeType === 'rect' ? shapeRadius : undefined,
                color: shapeColor,
                borderWidth: shapeBorderWidth,
              },
            })
          }

          await tx.pdfGroupShape.create({
            data: {
              groupId,
              shapeId: resolvedShapeId,
              type: shapeData.type,
              localX: shapeData.localX,
              localY: shapeData.localY,
              width: shapeData.width,
              height: shapeData.height,
              radius: shapeData.radius,
              color: shapeData.color,
              borderWidth: shapeData.borderWidth,
              radiusCorner: shapeData.radius,
            },
          })
        }
      }
    })

    return this.getObjects(deviceId, pdfId)
  }

  async uploadCaptured(deviceId: string, pdfId: string, imageBase64: string) {
    const user = await this.ensureUser(deviceId)
    const file = await this.prisma.pdfFile.findFirst({
      where: { id: pdfId, userId: user.id },
    })
    if (!file) throw new NotFoundException('PDF not found')

    const pngBuffer = Buffer.from(imageBase64, 'base64')
    const metadata = await sharp(pngBuffer).metadata()
    const width = metadata.width ?? 0
    const height = metadata.height ?? 0

    const created = await this.prisma.capturedImage.create({
      data: {
        userId: user.id,
        pdfFileId: pdfId,
        s3Key: '', // set after we get sequenceId
        width,
        height,
      },
    })

    const s3Key = idToS3Key(created.sequenceId, 'captured', created.id)
    await this.prisma.capturedImage.update({
      where: { id: created.id },
      data: { s3Key },
    })
    await this.s3.upload(s3Key, pngBuffer, 'image/png')

    const url = await this.s3.getSignedUrl(s3Key, 3600)
    return {
      id: created.id,
      s3Key,
      width,
      height,
      createdAt: created.createdAt,
      url,
    }
  }

  async listCaptured(deviceId: string, pdfId: string) {
    const user = await this.ensureUser(deviceId)
    const file = await this.prisma.pdfFile.findFirst({
      where: { id: pdfId, userId: user.id },
    })
    if (!file) throw new NotFoundException('PDF not found')

    const images = await this.prisma.capturedImage.findMany({
      where: { pdfFileId: pdfId, userId: user.id },
      orderBy: { createdAt: 'desc' },
      select: { id: true, width: true, height: true, createdAt: true, s3Key: true },
    })

    const result = await Promise.all(
      images.map(async (img) => ({
        id: img.id,
        width: img.width,
        height: img.height,
        createdAt: img.createdAt,
        url: await this.s3.getSignedUrl(img.s3Key, 3600),
      })),
    )
    return result
  }

  async getCapturedStream(deviceId: string, pdfId: string, capturedId: string) {
    const user = await this.ensureUser(deviceId)
    const image = await this.prisma.capturedImage.findFirst({
      where: { id: capturedId, pdfFileId: pdfId, userId: user.id },
    })
    if (!image) throw new NotFoundException('Captured image not found')
    return this.s3.getStream(image.s3Key)
  }

  async deleteCaptured(deviceId: string, pdfId: string, capturedId: string) {
    const user = await this.ensureUser(deviceId)
    const image = await this.prisma.capturedImage.findFirst({
      where: { id: capturedId, pdfFileId: pdfId, userId: user.id },
    })
    if (!image) throw new NotFoundException('Captured image not found')

    try {
      await this.s3.delete(image.s3Key)
    } catch {
      // ignore if already deleted
    }
    await this.prisma.capturedImage.delete({ where: { id: capturedId } })
    return { deleted: true }
  }
}
