import { Module, forwardRef } from '@nestjs/common';
import { LessonsService } from './lesson.service';
import { LessonsController } from './lesson.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Lesson } from './entities/lesson.entity';
import { Group } from '../groups/entities/group.entity';
import { Student } from '../students/entities/student.entity';
import { Attendance } from '../attendance/entities/attendance.entity';
import { Teacher } from '../teacher/entities/teacher.entity';
import { Payment } from 'src/payment/entities/payment.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Lesson, Group, Attendance, Teacher, Student, Payment])
  ],
  controllers: [LessonsController],
  providers: [LessonsService],
})
export class LessonsModule {}
