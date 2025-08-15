import { Controller, Get, Post, Body, Patch, Param, Delete, Req, UseGuards, Query } from '@nestjs/common';
import { AttendanceService } from './attendance.service';
import { CreateAttendanceDto } from './dto/create-attendance.dto';
import { UpdateAttendanceDto } from './dto/update-attendance.dto';
import { AuthGuard, Roles, RolesGuard } from '../auth/auth.guard';

@Controller('attendance')
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Roles('teacher')
  @UseGuards(AuthGuard, RolesGuard)
  @Post()
  create(@Req() req, @Body() createAttendanceDto: CreateAttendanceDto) {
    const teacherId = req.user.id;
    return this.attendanceService.create(createAttendanceDto, teacherId);
  }

  @Roles('teacher', 'admin', 'superAdmin')
  @UseGuards(AuthGuard, RolesGuard)
  @Get()
  findAll() {
    return this.attendanceService.findAll();
  }

  
  @Roles('superAdmin', 'teacher', 'admin')
  @UseGuards(AuthGuard, RolesGuard)
  @Get('statistics')
  getAttendanceStatistics(@Query('groupId') groupId: number) {
    return this.attendanceService.getAttendanceStatistics(groupId);
  }

  @Roles('teacher', 'admin', 'superAdmin')
  @UseGuards(AuthGuard, RolesGuard)
  @Get('group/:groupId')
  getAttendanceByGroup(@Param('groupId') groupId: number) {
    return this.attendanceService.getAttendanceByGroup(groupId);
  }

  @Roles('superAdmin', 'teacher', 'admin',)
  @UseGuards(AuthGuard, RolesGuard)
  @Get('daily/:groupId')
  getDailyAttendance(
    @Param('groupId') groupId: number,
    @Query('date') date: string,
    @Query('studentName') studentName: string,
  ) {
    return this.attendanceService.getDailyAttendance(groupId, date, studentName);
  }

  
  @Roles('teacher', 'admin', 'superAdmin')
  @UseGuards(AuthGuard, RolesGuard)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.attendanceService.findOne(+id);
  }

  @Roles('teacher')
  @UseGuards(AuthGuard, RolesGuard)
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateAttendanceDto: UpdateAttendanceDto) {
    return this.attendanceService.update(+id, updateAttendanceDto);
  }

  @Roles('teacher')
  @UseGuards(AuthGuard, RolesGuard)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.attendanceService.remove(+id);
  }
}
