import { Controller, Post, UseGuards, Headers } from '@nestjs/common'
import { UsersService } from './users.service'
import { DeviceIdGuard } from '../common/guards/device-id.guard'
import { DeviceId } from '../common/decorators/device-id.decorator'

@Controller('api/users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post('ensure')
  @UseGuards(DeviceIdGuard)
  async ensure(
    @DeviceId() deviceId: string,
    @Headers('user-agent') userAgent?: string,
  ) {
    const user = await this.usersService.ensureByDeviceId(deviceId, userAgent)
    return { id: user.id, deviceId: user.deviceId }
  }
}
