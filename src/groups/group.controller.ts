import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards } from '@nestjs/common';
import { GroupsService } from './group.service';
import { CreateGroupDto } from './dto/create-group.dto';
import { UpdateGroupDto } from './dto/update-group.dto';
import { AuthGuard, Roles, RolesGuard } from '../auth/auth.guard';

@Controller('groups')
export class GroupsController {
  constructor(private readonly groupsService: GroupsService) {}

  @Roles('admin',  'superAdmin')
  @UseGuards(AuthGuard, RolesGuard)
  @Post()
  create(@Body() createGroupDto: CreateGroupDto) {
    return this.groupsService.createGroup(createGroupDto);
  }

  @Roles('admin', 'teacher', 'student')
  @UseGuards(AuthGuard, RolesGuard)
  @Get()
  getAllGroupsForAdmin() {
    return this.groupsService.getAllGroupsForAdmin();
  }

  @Roles('teacher')
  @UseGuards(AuthGuard, RolesGuard)
  @Get('teacher/:username')
  getGroupsByTeacherId(@Param('username') username: string) {
    return this.groupsService.getGroupsByTeacherId(username);
  }

  @Roles('student')
  @UseGuards(AuthGuard, RolesGuard)
  @Get('student/:username')
  getGroupsByStudentId(@Param('username') username: string) {
    return this.groupsService.getGroupsByStudentId(username);
  }

  @Roles('admin', 'teacher')
  @UseGuards(AuthGuard, RolesGuard)
  @Get(':id/students')
  getStudentGroups(@Param('id') id: string) {
    return this.groupsService.getStudentGroups(+id);
  }

  @Roles('admin', 'teacher')
  @UseGuards(AuthGuard, RolesGuard)
  @Get('search')
  searchGroups(@Query('name') name: string, @Query('teacherName') teacherName: string) {
    return this.groupsService.searchGroups(name, teacherName);
  }

  @Roles('admin')
  @UseGuards(AuthGuard, RolesGuard)
  @Patch(':id')
  updateGroup(@Param('id') id: string, @Body() updateGroupDto: UpdateGroupDto) {
    return this.groupsService.updateGroup(+id, updateGroupDto);
  }

  @Roles('admin')
  @UseGuards(AuthGuard, RolesGuard)
  @Delete(':id')
  deleteGroup(@Param('id') id: string) {
    return this.groupsService.deleteGroup(+id);
  }

  @Roles('admin')
  @UseGuards(AuthGuard, RolesGuard)
  @Get('course/:courseId')
  getGroupsByCourseId(@Param('courseId') courseId: string) {
    return this.groupsService.getGroupsByCourseId(+courseId);
  }

  @Roles('admin')
  @UseGuards(AuthGuard, RolesGuard)
  @Get(':id/students/list')
  getStudentsByGroupId(@Param('id') id: string) {
    return this.groupsService.getStudentsByGroupId(+id);
  }

  @Roles('admin')
  @UseGuards(AuthGuard, RolesGuard)
  @Post(':id/add-student')
  addStudentToGroup(@Param('id') id: string, @Query('studentId') studentId: string) {
    return this.groupsService.addStudentToGroup(+id, +studentId);
  }

  @Roles('admin')
  @UseGuards(AuthGuard, RolesGuard)
  @Delete(':id/remove-student')
  removeStudentFromGroup(@Param('id') id: string, @Query('studentId') studentId: string) {
    return this.groupsService.removeStudentFromGroup(+id, +studentId);
  }

  @Roles('admin')
  @UseGuards(AuthGuard, RolesGuard)
  @Post('transfer-student')
  transferStudentToGroup(
    @Query('fromGroupId') fromGroupId: string,
    @Query('toGroupId') toGroupId: string,
    @Query('studentId') studentId: string,
  ) {
    return this.groupsService.transferStudentToGroup(+fromGroupId, +toGroupId, +studentId);
  }

  
  @Roles('teacher', 'admin', 'superAdmin')
  @UseGuards(AuthGuard, RolesGuard)
  @Get('frozen-students')
  getFrozenStudents() {
    return this.groupsService.getFrozenStudents();
  }

  @Roles('admin')
  @UseGuards(AuthGuard, RolesGuard)
  @Post(':id/restore-student')
  restoreStudentToGroup(@Param('id') id: string, @Query('studentId') studentId: string) {
    return this.groupsService.restoreStudentToGroup(+id, +studentId);
  }
}