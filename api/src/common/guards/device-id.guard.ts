import {
  Injectable,
  CanActivate,
  ExecutionContext,
  BadRequestException,
} from '@nestjs/common'
import { Request } from 'express'

const HEADER_NAME = 'x-device-id'

@Injectable()
export class DeviceIdGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>()
    const deviceId = request.headers[HEADER_NAME] ?? request.headers['X-Device-ID']

    if (!deviceId || typeof deviceId !== 'string' || deviceId.trim().length === 0) {
      throw new BadRequestException(`Header ${HEADER_NAME} is required`)
    }

    ;(request as Request & { deviceId: string }).deviceId = deviceId.trim()
    return true
  }
}
