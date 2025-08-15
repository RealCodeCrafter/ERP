import { Controller, Get, Post, Put, Delete, Param, Body, UseGuards, Query } from '@nestjs/common';
import { StudentsService } from './student.service';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import { Student } from './entities/student.entity';
import { AuthGuard, Roles, RolesGuard } from '../auth/auth.guard';

@Controller('students')
export class StudentsController {
  constructor(private readonly studentsService: StudentsService) {}

  @Roles('admin', 'superAdmin')
  @UseGuards(AuthGuard, RolesGuard)
  @Post()
  async createStudent(@Body() createStudentDto: CreateStudentDto): Promise<Student> {
    return this.studentsService.createStudent(createStudentDto);
  }

  @Roles('admin', 'superAdmin')
  @UseGuards(AuthGuard, RolesGuard)
  @Get()
  async getAllStudents(): Promise<Student[]> {
    return this.studentsService.getAllStudents();
  }

  @Roles('admin', 'superAdmin')
  @UseGuards(AuthGuard, RolesGuard)
  @Get('active')
  async getActiveStudents(@Query('name') name: string, @Query('groupId') groupId: number): Promise<Student[]> {
    return this.studentsService.getActiveStudents(name, groupId);
  }

  @Roles('admin', 'superAdmin')
  @UseGuards(AuthGuard, RolesGuard)
  @Get('graduated')
  async getGraduatedStudents(@Query('name') name: string, @Query('groupId') groupId: number): Promise<Student[]> {
    return this.studentsService.getGraduatedStudents(name, groupId);
  }

  @Roles('admin', 'teacher', 'superAdmin')
  @UseGuards(AuthGuard, RolesGuard)
  @Get('search')
  async searchStudents(@Query('name') name: string): Promise<Student[]> {
    return this.studentsService.searchStudents(name);
  }

  @Roles('admin', 'superAdmin')
  @UseGuards(AuthGuard, RolesGuard)
  @Get('attendance-ranking')
  async getAttendanceRanking(): Promise<Student[]> {
    return this.studentsService.getAttendanceRanking();
  }

  
  @UseGuards(AuthGuard)
  @Get(':id')
  async getStudentById(@Param('id') id: number): Promise<Student> {
    return this.studentsService.getStudentById(id);
  }

  
  @Roles('admin', 'superAdmin')
  @UseGuards(AuthGuard, RolesGuard)
  @Put(':id')
  async updateStudent(
    @Param('id') id: number,
    @Body() updateStudentDto: UpdateStudentDto,
  ): Promise<Student> {
    return this.studentsService.updateStudent(id, updateStudentDto);
  }

  @Roles('admin', 'superAdmin')
  @UseGuards(AuthGuard, RolesGuard)
  @Delete(':id')
  async deleteStudent(@Param('id') id: number): Promise<void> {
    await this.studentsService.deleteStudent(id);
  }
}