import { createParamDecorator, ExecutionContext } from '@nestjs/common'

export const DeviceId = createParamDecorator((_: unknown, ctx: ExecutionContext): string => {
  const request = ctx.switchToHttp().getRequest<Request & { deviceId?: string }>()
  return request.deviceId ?? ''
})
