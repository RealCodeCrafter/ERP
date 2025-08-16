import { Controller, Get, Post, Put, Delete, Param, Body, ParseIntPipe, UseGuards, Query } from '@nestjs/common';
import { AdminService } from './admin.service';
import { CreateAdminDto } from './dto/create-admin.dto';
import { UpdateAdminDto } from './dto/update-admin.dto';
import { AuthGuard, Roles, RolesGuard } from '../auth/auth.guard';

@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Roles('superAdmin')
  @UseGuards(AuthGuard, RolesGuard)
  @Get()
  getAll() {
    return this.adminService.getAll();
  }

  @Roles('superAdmin')
  @UseGuards(AuthGuard, RolesGuard)
  @Post()
  create(@Body() createAdminDto: CreateAdminDto) {
    return this.adminService.create(createAdminDto);
  }

  @Roles('superAdmin')
  @UseGuards(AuthGuard, RolesGuard)
  @Put(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() updateAdminDto: UpdateAdminDto) {
    return this.adminService.update(id, updateAdminDto);
  }

  @Roles('superAdmin')
  @UseGuards(AuthGuard, RolesGuard)
  @Delete(':id')
  delete(@Param('id', ParseIntPipe) id: number) {
    return this.adminService.delete(id);
  }

  @Roles('superAdmin')
  @UseGuards(AuthGuard, RolesGuard)
  @Get('search')
  searchAdmins(@Query('name') name: string) {
    return this.adminService.searchAdmins(name);
  }

  @Roles('superAdmin', 'admin')
  @UseGuards(AuthGuard, RolesGuard)
  @Get('statistics')
  getStatistics() {
    return this.adminService.getStatistics();
  }
}