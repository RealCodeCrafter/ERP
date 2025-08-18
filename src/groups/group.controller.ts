import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards, Put, NotFoundException, Req, ParseIntPipe, HttpStatus } from '@nestjs/common';
import { GroupsService } from './group.service';
import { CreateGroupDto } from './dto/create-group.dto';
import { UpdateGroupDto } from './dto/update-group.dto';
import { AuthGuard, Roles, RolesGuard } from '../auth/auth.guard';
import { Group } from './entities/group.entity';

@Controller('groups')
export class GroupsController {
  constructor(private readonly groupsService: GroupsService) {}

  @Roles('admin', 'superAdmin')
  @UseGuards(AuthGuard, RolesGuard)
  @Post()
  create(@Body() createGroupDto: CreateGroupDto) {
    return this.groupsService.createGroup(createGroupDto);
  }
  
@Roles('teacher')
@UseGuards(AuthGuard, RolesGuard)
@Get('my/teacher/groups')
async getGroupsByTeacher(@Req() req: any) {
  const teacherId = req.user?.id;
  if (!teacherId) {
    throw new NotFoundException('Teacher not found in token');
  }
  return this.groupsService.getGroupsByTeacherId(teacherId);
}


  // 🔹 Guruhga student qo‘shish
  @Roles('admin', 'superAdmin')
  @UseGuards(AuthGuard, RolesGuard)
  @Post(':id/add-student')
  addStudentToGroup(
    @Param('id', new ParseIntPipe({ errorHttpStatusCode: HttpStatus.BAD_REQUEST })) id: number,
    @Query('studentId', new ParseIntPipe({ errorHttpStatusCode: HttpStatus.BAD_REQUEST })) studentId: number,
  ) {
    return this.groupsService.addStudentToGroup(id, studentId);
  }

  @Roles('student', 'superAdmin', 'admin')
  @UseGuards(AuthGuard, RolesGuard)
  @Get('student/:username')
  getGroupsByStudentId(@Param('username') username: string) {
    return this.groupsService.getGroupsByStudentId(username);
  }

  @Roles('admin', 'teacher', 'superAdmin')
  @UseGuards(AuthGuard, RolesGuard)
  @Get(':id/students')
  getStudentGroups(@Param('id') id: string) {
    return this.groupsService.getStudentGroups(+id);
  }

  @Roles('admin', 'teacher', 'superAdmin')
  @UseGuards(AuthGuard, RolesGuard)
  @Get('search')
  searchGroups(@Query('name') name: string, @Query('teacherName') teacherName: string) {
    return this.groupsService.searchGroups(name, teacherName);
  }

  @Roles('admin', 'superAdmin')
  @UseGuards(AuthGuard, RolesGuard)
  @Get('course/:courseId')
  getGroupsByCourseId(@Param('courseId') courseId: string) {
    return this.groupsService.getGroupsByCourseId(+courseId);
  }

  @Roles('admin', 'superAdmin')
  @UseGuards(AuthGuard, RolesGuard)
  @Get(':id/students/list')
  getStudentsByGroupId(@Param('id') id: string) {
    return this.groupsService.getStudentsByGroupId(+id);
  }

  @Roles('admin', 'superAdmin')
  @UseGuards(AuthGuard, RolesGuard)
  @Delete(':id/remove-student')
  removeStudentFromGroup(@Param('id') id: string, @Query('studentId') studentId: string) {
    return this.groupsService.removeStudentFromGroup(+id, +studentId);
  }

  @Roles('admin', 'superAdmin')
  @UseGuards(AuthGuard, RolesGuard)
  @Post('transfer-student')
  transferStudentToGroup(
    @Query('fromGroupId') fromGroupId: string,
    @Query('toGroupId') toGroupId: string,
    @Query('studentId') studentId: string,
  ) {
    return this.groupsService.transferStudentToGroup(+fromGroupId, +toGroupId, +studentId);
  }

  @Roles('admin', 'superAdmin')
  @UseGuards(AuthGuard, RolesGuard)
  @Post(':id/restore-student')
  restoreStudentToGroup(@Param('id') id: string, @Query('studentId') studentId: string) {
    return this.groupsService.restoreStudentToGroup(+id, +studentId);
  }

@Roles('admin', 'teacher', 'student', 'superAdmin')
  @UseGuards(AuthGuard, RolesGuard)
  @Get()
  async getAllGroupsForAdmin(@Query('search') search?: string) {
    return this.groupsService.getAllGroupsForAdmin(search);
  }
  @Roles('admin', 'superAdmin')
  @UseGuards(AuthGuard, RolesGuard)
  @Put(':id')
  updateGroup(@Param('id') id: string, @Body() updateGroupDto: UpdateGroupDto) {
    return this.groupsService.updateGroup(+id, updateGroupDto);
  }

  @Roles('admin', 'superAdmin')
  @UseGuards(AuthGuard, RolesGuard)
  @Delete(':id')
  deleteGroup(@Param('id') id: string) {
    return this.groupsService.deleteGroup(+id);
  }

  @Roles('admin', 'teacher', 'superAdmin')
  @UseGuards(AuthGuard, RolesGuard)
  @Get(':id')
  async getGroupById(@Param('id') id: string) {
    return this.groupsService.getGroupById(+id);
  }
}