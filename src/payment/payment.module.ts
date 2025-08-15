import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Payment } from './entities/payment.entity';
import { PaymentController } from './payment.controller';
import { PaymentService } from './payment.service';
import { Student } from '../students/entities/student.entity';
import { Group } from '../groups/entities/group.entity';
import { Teacher } from '../teacher/entities/teacher.entity';
import { HttpModule } from '@nestjs/axios';
import { ScheduleModule } from '@nestjs/schedule';
import { Course } from 'src/courses/entities/course.entity';
import { GroupsModule } from 'src/groups/group.module';
import { LessonsModule } from 'src/lesson/lesson.module';
import { Lesson } from 'src/lesson/entities/lesson.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Payment, Student, Group, Teacher, Course, Lesson]),
    HttpModule,
    ScheduleModule.forRoot(),
    forwardRef(() => GroupsModule),
    forwardRef(() => LessonsModule)
  ],
  controllers: [PaymentController],
  providers: [PaymentService],
  exports: [TypeOrmModule], // 🔹 PaymentRepository eksport qilinadi
})
export class PaymentModule {}