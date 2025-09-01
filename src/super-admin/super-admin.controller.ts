import { Controller, Get, Post, Put, Delete, Param, Body, UseGuards, Query, Patch, ParseIntPipe } from '@nestjs/common';
import { SuperAdminService } from './super-admin.service';
import { CreateSuperAdminDto } from './dto/create-super-admin.dto';
import { UpdateSuperAdminDto } from './dto/update-super-admin.dto';
import { AuthGuard, Roles, RolesGuard } from '../auth/auth.guard';

@Controller('super-admin')
export class SuperAdminController {
  constructor(private readonly superAdminService: SuperAdminService) {}

  @Roles('superAdmin')
  @UseGuards(AuthGuard, RolesGuard)
  @Get()
  getAll() {
    return this.superAdminService.getAll();
  }


  
  @Post()
  create(@Body() createSuperAdminDto: CreateSuperAdminDto) {
    return this.superAdminService.create(createSuperAdminDto);
  }

  @Roles('superAdmin')
  @UseGuards(AuthGuard, RolesGuard)
  @Put(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() updateSuperAdminDto: UpdateSuperAdminDto) {
    return this.superAdminService.update(id, updateSuperAdminDto);
  }

  @Roles('superAdmin')
  @UseGuards(AuthGuard, RolesGuard)
  @Delete(':id')
  delete(@Param('id', ParseIntPipe) id: number) {
    return this.superAdminService.delete(id);
  }

  @Roles('superAdmin')
  @UseGuards(AuthGuard, RolesGuard)
  @Get('search')
  searchSuperAdmins(@Query('name') name: string) {
    return this.superAdminService.searchSuperAdmins(name);
  }

  @Roles('superAdmin')
  @UseGuards(AuthGuard, RolesGuard)
  @Patch(':id/sms-notifications')
  toggleSmsNotifications(@Param('id', ParseIntPipe) id: number, @Body('enable') enable: boolean) {
    return this.superAdminService.toggleSmsNotifications(id, enable);
  }

  @Roles('superAdmin')
  @UseGuards(AuthGuard, RolesGuard)
  @Get('statistics')
  getStatistics() {
    return this.superAdminService.getStatistics();
  }
}