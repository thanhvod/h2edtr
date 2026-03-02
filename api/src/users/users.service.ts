import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { User } from '@prisma/client'

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async ensureByDeviceId(deviceId: string, userAgent?: string): Promise<User> {
    const existing = await this.prisma.user.findUnique({
      where: { deviceId },
    })
    if (existing) {
      await this.prisma.user.update({
        where: { id: existing.id },
        data: { lastLoginAt: new Date(), userAgent: userAgent ?? existing.userAgent },
      })
      return { ...existing, lastLoginAt: new Date(), userAgent: userAgent ?? existing.userAgent }
    }

    return this.prisma.user.create({
      data: { deviceId, userAgent: userAgent ?? null, lastLoginAt: new Date() },
    })
  }

  async listForAdmin(): Promise<
    Array<{ id: string; deviceId: string; userAgent: string | null; createdAt: Date; lastLoginAt: Date | null }>
  > {
    return this.prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        deviceId: true,
        userAgent: true,
        createdAt: true,
        lastLoginAt: true,
      },
    })
  }

  async findByDeviceId(deviceId: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { deviceId },
    })
  }
}
