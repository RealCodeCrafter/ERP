import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';

import { Course } from './courses/entities/course.entity';
import { Group } from './groups/entities/group.entity';
import { Profile } from './profile/entities/profile.entity';
import { Student } from './students/entities/student.entity';
import { Teacher } from './teacher/entities/teacher.entity';
import { Lesson } from './lesson/entities/lesson.entity';
import { Attendance } from './attendance/entities/attendance.entity';
import { Admin } from './admin/entities/admin.entity';
import { SuperAdmin } from './super-admin/entities/super-admin.entity';
import { Payment } from './payment/entities/payment.entity';

import { CoursesModule } from './courses/courses.module';
import { StudentsModule } from './students/student.module';
import { AuthModule } from './auth/auth.module';
import { ProfilesModule } from './profile/profile.module';
import { TeachersModule } from './teacher/teacher.module';
import { GroupsModule } from './groups/group.module';
import { LessonsModule } from './lesson/lesson.module';
import { AttendanceModule } from './attendance/attendance.module';
import { AdminModule } from './admin/admin.module';
import { SuperAdminModule } from './super-admin/super-admin.module';
import { PaymentModule } from './payment/payment.module';
import { SmsModule } from './sms/sms.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    HttpModule.register({
      timeout: 5000,
      maxRedirects: 5,
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('DB_HOST'),
        port: parseInt(configService.get<string>('DB_PORT'), 10),
        username: configService.get<string>('DB_USERNAME'),
        password: configService.get<string>('DB_PASSWORD'),
        database: configService.get<string>('DB_NAME'),
        entities: [
          Course,
          Group,
          Profile,
          Student,
          Teacher,
          Lesson,
          Attendance,
          Admin,
          SuperAdmin,
          Payment,
        ],
        synchronize: true,
        autoLoadEntities: true,
        ssl: {
          rejectUnauthorized: false        },
      }),
    }),
    CoursesModule,
    StudentsModule,
    AuthModule,
    ProfilesModule,
    TeachersModule,
    GroupsModule,
    LessonsModule,
    AttendanceModule,
    AdminModule,
    SuperAdminModule,
    PaymentModule,
    SmsModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
