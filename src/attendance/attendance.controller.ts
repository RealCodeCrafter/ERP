import { Controller, Get, Post, Body, Patch, Param, Delete, Req, UseGuards, Query, BadRequestException } from '@nestjs/common';
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
  

  @Roles('admin', 'superAdmin')
@UseGuards(AuthGuard, RolesGuard)
@Get('missing')
async getGroupsWithoutAttendance(@Query('date') date: string) {
  if (!date) {
    throw new BadRequestException('date query param is required (YYYY-MM-DD)');
  }
  return this.attendanceService.getGroupsWithoutAttendance(date);
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

  @Roles('admin', 'teacher', 'superAdmin')
@UseGuards(AuthGuard, RolesGuard)
@Get('search/daily-stats')
async getDailyAttendanceStats(
  @Query('groupId') groupId?: string,
  @Query('date') date?: string,
  @Query('period') period?: 'daily' | 'weekly' | 'monthly',
  @Query('studentName') studentName?: string,
) {
  return this.attendanceService.getDailyAttendanceStats(
    groupId ? parseInt(groupId, 10) : undefined,
    date,
    period,
    studentName,
  );
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
@Patch('/lesson/:lessonId')
async bulkUpdateAttendance(
  @Req() req: any,
  @Param('lessonId') lessonId: string,
  @Body() updateAttendanceDto: UpdateAttendanceDto,
) {
  const teacherId = Number(req.user.id);
  if (isNaN(teacherId)) {
    throw new BadRequestException('Invalid teacher ID in token');
  }

  const id = Number(lessonId);
  if (isNaN(id)) {
    throw new BadRequestException('Invalid lesson ID');
  }

  return this.attendanceService.bulkUpdateByLesson(id, updateAttendanceDto, teacherId);
}



  @Roles('teacher')
  @UseGuards(AuthGuard, RolesGuard)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.attendanceService.remove(+id);
  }
}