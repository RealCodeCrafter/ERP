import { Controller, Get, Post, Put, Delete, Param, Body, UseGuards, Query, Req, BadRequestException } from '@nestjs/common';
import { TeachersService } from './teacher.service';
import { CreateTeacherDto } from './dto/create-teacher.dto';
import { UpdateTeacherDto } from './dto/update-teacher.dto';
import { Teacher } from './entities/teacher.entity';
import { AuthGuard, Roles, RolesGuard } from '../auth/auth.guard';

@Controller('teachers')
export class TeachersController {
  constructor(private readonly teachersService: TeachersService) {}

  @Roles('admin', 'superAdmin')
  @UseGuards(AuthGuard, RolesGuard)
  @Post()
  async createTeacher(@Body() createTeacherDto: CreateTeacherDto): Promise<Teacher> {
    return this.teachersService.createTeacher(createTeacherDto);
  }

  @Roles('admin', 'superAdmin')
  @UseGuards(AuthGuard, RolesGuard)
  @Get()
  async getAllTeachers(@Query('groupId') groupId: number): Promise<Teacher[]> {
    return this.teachersService.getAllTeachers(groupId);
  }



  @Roles('admin', 'teacher', 'superAdmin')
  @UseGuards(AuthGuard, RolesGuard)
  @Get(':id')
  async getTeacherById(@Param('id') id: number): Promise<Teacher> {
    return this.teachersService.getTeacherById(id);
  }

  @Roles('admin', 'teacher', 'superAdmin')
  @UseGuards(AuthGuard, RolesGuard)
  @Get(':id/profile')
  async getTeacherProfile(@Param('id') id: number): Promise<any> {
    return this.teachersService.getTeacherProfile(id);
  }

  

  @Roles('teacher')
  @UseGuards(AuthGuard, RolesGuard)
  @Get('dashboard')
  async getTeacherDashboardStats(@Req() req: any) {
    const teacherId = parseInt(req.user.userId, 10); // JWT tokendan teacherId olinadi
    if (isNaN(teacherId)) {
      throw new BadRequestException('Invalid teacher ID in token');
    }
    return this.teachersService.getTeacherDashboardStats(teacherId);
  }

  @Roles('teacher')
  @UseGuards(AuthGuard, RolesGuard)
  @Get('search/groups')
  async searchTeacherGroupsByName(@Req() req: any, @Query('groupName') groupName?: string) {
    const teacherId =  req.user.userId
    if (isNaN(teacherId)) {
      throw new BadRequestException('Invalid teacher ID in token');
    }
    return this.teachersService.searchTeacherGroupsByName(teacherId, groupName);
  }

  @Roles('admin', 'superAdmin')
  @UseGuards(AuthGuard, RolesGuard)
  @Put(':id')
  async updateTeacher(@Param('id') id: number, @Body() updateTeacherDto: UpdateTeacherDto): Promise<Teacher> {
    return this.teachersService.updateTeacher(id, updateTeacherDto);
  }

  @Roles('admin', 'superAdmin')
  @UseGuards(AuthGuard, RolesGuard)
  @Delete(':id')
  async deleteTeacher(@Param('id') id: number): Promise<void> {
    await this.teachersService.deleteTeacher(id);
  }

  @Roles('admin', 'superAdmin')
  @UseGuards(AuthGuard, RolesGuard)
  @Get('search')
  async searchTeachers(@Query('name') name: string, @Query('groupId') groupId: number): Promise<Teacher[]> {
    return this.teachersService.searchTeachers(name, groupId);
  }

  @Roles('admin', 'superAdmin')
  @UseGuards(AuthGuard, RolesGuard)
  @Get('statistics')
  async getTeacherStatistics(@Query('groupId') groupId: number): Promise<any[]> {
    return this.teachersService.getTeacherStatistics(groupId);
  }
}