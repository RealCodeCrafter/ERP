import { Module, forwardRef } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import * as dotenv from 'dotenv';
import { StudentsModule } from '../students/student.module';
import { TeachersModule } from '../teacher/teacher.module';
import { Student } from '../students/entities/student.entity';
import { Teacher } from '../teacher/entities/teacher.entity';
import { Profile } from '../profile/entities/profile.entity';
import { GroupsModule } from '../groups/group.module';
import { Group } from '../groups/entities/group.entity';
import { Course } from '../courses/entities/course.entity';
import { ProfilesModule } from '../profile/profile.module';
import { CoursesModule } from '../courses/courses.module';
import { TeachersService } from '../teacher/teacher.service';
import { StudentsService } from '../students/student.service';
import { AdminModule } from '../admin/admin.module';
import { AttendanceModule } from '../attendance/attendance.module';
import { Attendance } from '../attendance/entities/attendance.entity';
import { Lesson } from '../lesson/entities/lesson.entity';
import { Admin } from '../admin/entities/admin.entity';
import { LessonsModule } from '../lesson/lesson.module';
import { SuperAdmin } from '../super-admin/entities/super-admin.entity';
import { SuperAdminModule } from '../super-admin/super-admin.module';

dotenv.config();

@Module({
  imports: [
    TypeOrmModule.forFeature([Student, Teacher, Profile, Group, Course, Admin, Attendance, Lesson, SuperAdmin]),
    JwtModule.register({
      global: true,
      secret: process.env.JWT_SECRET || 'juda_secret_key',
      signOptions: { expiresIn: '1d' },
    }),
    forwardRef(() => GroupsModule),
    forwardRef(() => ProfilesModule),
    forwardRef(() => CoursesModule),
    forwardRef(() => AdminModule),
    forwardRef(() => AttendanceModule),
    forwardRef(() => TeachersModule),
    forwardRef(() => LessonsModule),
    forwardRef(() => SuperAdminModule),
  ],
  controllers: [AuthController],
  providers: [AuthService, TeachersService, StudentsService],
})
export class AuthModule {}