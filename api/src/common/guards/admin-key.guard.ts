import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common'
import { Request } from 'express'

const HEADER_NAME = 'x-admin-key'

@Injectable()
export class AdminKeyGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const expected = process.env.ADMIN_API_KEY?.trim()

    // Dev: if ADMIN_API_KEY not configured, allow (local use only)
    if (!expected) {
      return true
    }

    const request = context.switchToHttp().getRequest<Request>()
    const key = (request.headers[HEADER_NAME] ?? request.headers['X-Admin-Key']) as string | undefined

    if (!key || key.trim() !== expected) {
      throw new UnauthorizedException('Invalid or missing admin key')
    }

    return true
  }
}
