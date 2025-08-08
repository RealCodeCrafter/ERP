import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ServeStaticModule } from '@nestjs/serve-static';
import { MulterModule } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import * as path from 'path';

import { Course } from './courses/entities/course.entity';
import { Group } from './groups/entities/group.entity';
import { Profile } from './profile/entities/profile.entity';
import { Student } from './students/entities/student.entity';
import { Teacher } from './teacher/entities/teacher.entity';
import { Lesson } from './lesson/entities/lesson.entity';
import { Assignment } from './assignments/entities/assignment.entity';
import { Submission } from './submissions/entities/submission.entity';
import { Attendance } from './attendance/entities/attendance.entity';
import { Admin } from './admin/entities/admin.entity';
import { superAdmin } from './super-admin/entities/super-admin.entity';

import { CoursesModule } from './courses/courses.module';
import { StudentsModule } from './students/student.module';
import { AuthModule } from './auth/auth.module';
import { ProfilesModule } from './profile/profile.module';
import { TeachersModule } from './teacher/teacher.module';
import { GroupsModule } from './groups/group.module';
import { LessonsModule } from './lesson/lesson.module';
import { AssignmentsModule } from './assignments/assignments.module';
import { SubmissionsModule } from './submissions/submissions.module';
import { AttendanceModule } from './attendance/attendance.module';
import { AdminModule } from './admin/admin.module';
import { SuperAdminModule } from './super-admin/super-admin.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true, // hamma joyda ishlatish uchun
    }),
    ServeStaticModule.forRoot({
      rootPath: path.join(__dirname, '..', 'uploads'),
      serveRoot: '/uploads',
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('DATABASE_HOST'),
        port: parseInt(configService.get<string>('DATABASE_PORT'), 10),
        username: configService.get<string>('DATABASE_USERNAME'),
        password: configService.get<string>('DATABASE_PASSWORD'),
        database: configService.get<string>('DATABASE_NAME'),
        entities: [
          Course,
          Group,
          Profile,
          Student,
          Teacher,
          Lesson,
          Assignment,
          Submission,
          Attendance,
          Admin,
          superAdmin,
        ],
        synchronize: true,
        autoLoadEntities: true,
        ssl: {
          rejectUnauthorized: false,
        },
      }),
    }),
    CoursesModule,
    StudentsModule,
    AuthModule,
    ProfilesModule,
    TeachersModule,
    GroupsModule,
    LessonsModule,
    AssignmentsModule,
    SubmissionsModule,
    AttendanceModule,
    AdminModule,
    SuperAdminModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
