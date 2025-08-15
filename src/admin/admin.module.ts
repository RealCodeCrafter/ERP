import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Admin } from './entities/admin.entity';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { Profile } from '../profile/entities/profile.entity';
import { Student } from 'src/students/entities/student.entity';
import { Group } from 'src/groups/entities/group.entity';
import { Course } from 'src/courses/entities/course.entity';
import { Payment } from 'src/payment/entities/payment.entity';
import { Attendance } from 'src/attendance/entities/attendance.entity';
import { StudentsModule } from 'src/students/student.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Admin, Profile, Student, Group, Course, Payment, Attendance]),
     forwardRef(() => StudentsModule)
  ],
  providers: [AdminService],
  controllers: [AdminController],
})
export class AdminModule {}
