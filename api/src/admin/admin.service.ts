import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { S3Service } from '../storage/s3.service'
import { idToS3Key } from '../storage/id-to-s3-key'

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly s3: S3Service,
  ) {}

  async getUserDetail(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        pdfFiles: {
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            sequenceId: true,
            filename: true,
            fileSize: true,
            numPages: true,
            thumbnailBase64: true,
            createdAt: true,
          },
        },
      },
    })
    if (!user) throw new NotFoundException('User not found')
    const pdfsWithThumbnails = await Promise.all(
      user.pdfFiles.map(async (f) => {
        let thumbnailUrl: string | null = null
        if (f.thumbnailBase64) {
          thumbnailUrl = `data:image/jpeg;base64,${f.thumbnailBase64}`
        } else {
          try {
            thumbnailUrl = await this.s3.getSignedUrl(
              idToS3Key(f.sequenceId, 'thumbnail'),
              3600,
            )
          } catch {
            // thumbnail may not exist in S3 yet
          }
        }
        return {
          id: f.id,
          filename: f.filename,
          fileSize: f.fileSize ? Number(f.fileSize) : null,
          numPages: f.numPages,
          thumbnailUrl,
          createdAt: f.createdAt.toISOString(),
        }
      }),
    )
    return {
      id: user.id,
      deviceId: user.deviceId,
      createdAt: user.createdAt ? new Date(user.createdAt).toISOString() : null,
      pdfs: pdfsWithThumbnails,
    }
  }

  async listUsers() {
    const users = await this.prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { pdfFiles: true } },
      },
    })
    return users.map((u) => ({
      id: u.id,
      deviceId: u.deviceId,
      createdAt: u.createdAt ? new Date(u.createdAt).toISOString() : null,
      pdfCount: u._count.pdfFiles,
    }))
  }

  async listPdfs() {
    const files = await this.prisma.pdfFile.findMany({
      orderBy: { createdAt: 'desc' },
      include: { user: true },
    })
    const result = await Promise.all(
      files.map(async (f) => {
        let thumbnailUrl: string | null = null
        if (f.thumbnailBase64) {
          thumbnailUrl = `data:image/jpeg;base64,${f.thumbnailBase64}`
        } else {
          try {
            thumbnailUrl = await this.s3.getSignedUrl(
              idToS3Key(f.sequenceId, 'thumbnail'),
              3600,
            )
          } catch {
            // thumbnail may not exist in S3 yet
          }
        }
        return {
          id: f.id,
          filename: f.filename,
          fileSize: f.fileSize ? Number(f.fileSize) : null,
          numPages: f.numPages,
          thumbnailUrl,
          createdAt: f.createdAt.toISOString(),
          userId: f.userId,
          userDeviceId: f.user.deviceId,
        }
      }),
    )
    return result
  }

  async deletePdf(id: string) {
    const file = await this.prisma.pdfFile.findUnique({
      where: { id },
      include: { pageImages: true },
    })
    if (!file) throw new NotFoundException('PDF not found')

    try {
      await this.s3.delete(idToS3Key(file.sequenceId, 'thumbnail'))
    } catch {
      // ignore
    }
    for (const page of file.pageImages) {
      try {
        await this.s3.delete(idToS3Key(page.sequenceId, 'image'))
      } catch {
        // ignore
      }
    }

    await this.prisma.pdfFile.delete({ where: { id } })
    return { deleted: true }
  }
}
