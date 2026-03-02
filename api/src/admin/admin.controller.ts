import { Controller, Get, Delete, Param, UseGuards } from '@nestjs/common'
import { AdminService } from './admin.service'
import { AdminKeyGuard } from '../common/guards/admin-key.guard'

@Controller('api/admin')
@UseGuards(AdminKeyGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('users')
  async listUsers() {
    return this.adminService.listUsers()
  }

  @Get('user/:id')
  async getUserDetail(@Param('id') id: string) {
    return this.adminService.getUserDetail(id)
  }

  @Get('pdfs')
  async listPdfs() {
    return this.adminService.listPdfs()
  }

  @Delete('pdfs/:id')
  async deletePdf(@Param('id') id: string) {
    return this.adminService.deletePdf(id)
  }
}
