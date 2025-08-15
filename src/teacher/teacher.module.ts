import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TeachersController } from './teacher.controller';
import { TeachersService } from './teacher.service';
import { Teacher } from './entities/teacher.entity';
import { Group } from '../groups/entities/group.entity';
import { Student } from '../students/entities/student.entity';
import { Profile } from '../profile/entities/profile.entity';
import { GroupsModule } from '../groups/group.module';
import { AuthModule } from '../auth/auth.module';
import { Attendance } from 'src/attendance/entities/attendance.entity';
import { AttendanceModule } from 'src/attendance/attendance.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Teacher, Group, Student, Profile, Attendance]),
    AttendanceModule
  ],
  controllers: [TeachersController],
  providers: [TeachersService],
})
export class TeachersModule {}
