import { Module, forwardRef } from '@nestjs/common';
import { AttendanceService } from './attendance.service';
import { AttendanceController } from './attendance.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Attendance } from './entities/attendance.entity';
import { Teacher } from '../teacher/entities/teacher.entity';
import { Lesson } from '../lesson/entities/lesson.entity';
import { Student } from '../students/entities/student.entity';
import { Group } from 'src/groups/entities/group.entity';
import { GroupsModule } from '../groups/group.module';
import { Payment } from 'src/payment/entities/payment.entity';
import { SuperAdmin } from 'src/super-admin/entities/super-admin.entity';
import { SmsModule } from 'src/sms/sms.module';
import { SmsService } from 'src/sms/sms.service';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [
    TypeOrmModule.forFeature([Attendance, Teacher, Lesson, Student, Group, Payment, SuperAdmin]),
    forwardRef(() => GroupsModule),
    SmsModule,
    HttpModule
  ],
  controllers: [AttendanceController],
  providers: [AttendanceService, SmsService],
  exports: [AttendanceService, TypeOrmModule],
})
export class AttendanceModule {}
