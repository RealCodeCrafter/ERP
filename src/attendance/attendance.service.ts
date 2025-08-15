import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository, ILike } from 'typeorm';
import { Attendance } from './entities/attendance.entity';
import { CreateAttendanceDto } from './dto/create-attendance.dto';
import { UpdateAttendanceDto } from './dto/update-attendance.dto';
import { Student } from '../students/entities/student.entity';
import { Teacher } from '../teacher/entities/teacher.entity';
import { Lesson } from '../lesson/entities/lesson.entity';
import { Group } from '../groups/entities/group.entity';
import { Payment } from '../payment/entities/payment.entity';
import { SuperAdmin } from '../super-admin/entities/super-admin.entity';
import { SmsService } from '../sms/sms.service';
import { SchedulerRegistry } from '@nestjs/schedule';
import { Cron } from '@nestjs/schedule';

@Injectable()
export class AttendanceService {
  constructor(
    @InjectRepository(Attendance)
    private readonly attendanceRepository: Repository<Attendance>,
    @InjectRepository(Teacher)
    private readonly teacherRepository: Repository<Teacher>,
    @InjectRepository(Student)
    private readonly studentRepository: Repository<Student>,
    @InjectRepository(Lesson)
    private readonly lessonRepository: Repository<Lesson>,
    @InjectRepository(Group)
    private readonly groupRepository: Repository<Group>,
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
    @InjectRepository(SuperAdmin)
    private readonly superAdminRepository: Repository<SuperAdmin>,
    private readonly smsService: SmsService,
    private readonly schedulerRegistry: SchedulerRegistry,
  ) {}

  async create(createAttendanceDto: CreateAttendanceDto, teacherId: number) {
    const teacher = await this.teacherRepository.findOne({ where: { id: teacherId } });
    if (!teacher) {
      throw new NotFoundException('Teacher not found');
    }

    const lesson = await this.lessonRepository.findOne({
      where: { id: createAttendanceDto.lessonId },
      relations: ['group', 'group.teacher', 'group.course'],
    });
    if (!lesson) {
      throw new NotFoundException('Lesson not found');
    }

    if (lesson.group.teacher.id !== teacherId) {
      throw new ForbiddenException('You can only mark attendance for your own group');
    }

    const firstLessonDate = await this.getFirstLessonDate(lesson.group.id);
    if (!firstLessonDate) {
      throw new NotFoundException('No lessons found for this group');
    }

    const currentDate = new Date();
    const { currentCycle, isFirstCycle } = this.calculatePaymentCycle(firstLessonDate, currentDate);

    const results = [];
    for (const attendanceDto of createAttendanceDto.attendances) {
      const student = await this.studentRepository.findOne({ where: { id: attendanceDto.studentId } });
      if (!student) {
        throw new NotFoundException(`Student with ID ${attendanceDto.studentId} not found`);
      }

      // Agar joriy tsikl birinchi tsikl bo'lsa, to'lov tekshiruvi o'tkazilmaydi
      if (!isFirstCycle) {
        const previousCycle = {
          startDate: new Date(currentCycle.startDate),
          endDate: new Date(currentCycle.startDate),
        };
        previousCycle.startDate.setDate(previousCycle.startDate.getDate() - 30);
        previousCycle.endDate.setDate(previousCycle.endDate.getDate() - 1);

        const payment = await this.paymentRepository.findOne({
          where: {
            student: { id: attendanceDto.studentId },
            group: { id: lesson.group.id },
            paid: true,
            createdAt: Between(previousCycle.startDate, previousCycle.endDate),
          },
        });
        if (!payment) {
          throw new ForbiddenException(
            `Student ${attendanceDto.studentId} has not paid for the previous payment cycle of ${lesson.group.name}`,
          );
        }
      }

      const existingAttendance = await this.attendanceRepository.findOne({
        where: {
          student: { id: attendanceDto.studentId },
          lesson: { id: createAttendanceDto.lessonId },
        },
      });
      if (existingAttendance) {
        throw new ForbiddenException(`Attendance for student ${attendanceDto.studentId} already exists for this lesson`);
      }

      const attendance = this.attendanceRepository.create({
        student,
        lesson,
        status: attendanceDto.status,
        teacher,
      });

      const savedAttendance = await this.attendanceRepository.save(attendance);
      results.push(savedAttendance);
    }

    return results;
  }

  async findAll() {
    return this.attendanceRepository.find({
      relations: ['student', 'lesson', 'lesson.group', 'lesson.group.course'],
    });
  }

  async findOne(id: number) {
    const attendance = await this.attendanceRepository.findOne({
      where: { id },
      relations: ['student', 'lesson', 'lesson.group', 'lesson.group.course'],
    });
    if (!attendance) {
      throw new NotFoundException('Attendance not found');
    }
    return attendance;
  }

  async update(id: number, updateAttendanceDto: UpdateAttendanceDto) {
    const attendance = await this.findOne(id);
    if (updateAttendanceDto.status) {
      attendance.status = updateAttendanceDto.status;
    }
    return this.attendanceRepository.save(attendance);
  }

  async remove(id: number) {
    const attendance = await this.findOne(id);
    return this.attendanceRepository.remove(attendance);
  }

  async getAttendanceByGroup(groupId: number) {
    const group = await this.groupRepository.findOne({ where: { id: groupId } });
    if (!group) {
      throw new NotFoundException('Group not found');
    }

    return this.attendanceRepository.find({
      where: { lesson: { group: { id: groupId } } },
      relations: ['student', 'lesson', 'lesson.group', 'lesson.group.course'],
    });
  }

  async getDailyAttendance(groupId: number, date: string, studentName?: string) {
    const group = await this.groupRepository.findOne({ where: { id: groupId } });
    if (!group) {
      throw new NotFoundException('Group not found');
    }

    const startDate = new Date(date);
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 1);

    const query: any = {
      lesson: { group: { id: groupId }, lessonDate: Between(startDate, endDate) },
    };
    if (studentName) {
      query.student = [
        { firstName: ILike(`%${studentName}%`) },
        { lastName: ILike(`%${studentName}%`) },
      ];
    }

    const attendances = await this.attendanceRepository.find({
      where: query,
      relations: ['student', 'lesson', 'lesson.group', 'lesson.group.course', 'lesson.group.teacher'],
    });

    const totalStudents = (
      await this.groupRepository.findOne({
        where: { id: groupId },
        relations: ['students'],
      })
    ).students.length;

    const present = attendances.filter(a => a.status === 'present').length;
    const absent = attendances.filter(a => a.status === 'absent').length;
    const late = attendances.filter(a => a.status === 'late').length;

    return {
      totalStudents,
      present,
      absent,
      late,
      attendances,
    };
  }

  async getAttendanceStatistics(groupId?: number) {
    const query: any = {};
    if (groupId) {
      query.lesson = { group: { id: groupId } };
    }

    const attendances = await this.attendanceRepository.find({
      where: query,
      relations: ['student', 'lesson', 'lesson.group'],
    });

    const studentStats = attendances.reduce((acc, curr) => {
      const studentId = curr.student.id;
      if (!acc[studentId]) {
        acc[studentId] = {
          student: curr.student,
          present: 0,
          absent: 0,
          late: 0,
        };
      }
      if (curr.status === 'present') acc[studentId].present += 1;
      if (curr.status === 'absent') acc[studentId].absent += 1;
      if (curr.status === 'late') acc[studentId].late += 1;
      return acc;
    }, {});

    const result = Object.values(studentStats)
      .map((stat: any) => ({
        student: stat.student,
        present: stat.present,
        absent: stat.absent,
        late: stat.late,
        total: stat.present + stat.absent + stat.late,
      }))
      .sort((a, b) => b.present - a.present);

    return result;
  }

  @Cron('*/15 * * * *', { name: 'checkAttendanceReminders' })
  async checkAttendanceReminders() {
    const now = new Date();
    const fifteenMinutesAgo = new Date(now.getTime() - 15 * 60 * 1000);

    const lessons = await this.lessonRepository.find({
      where: {
        lessonDate: Between(fifteenMinutesAgo, now),
      },
      relations: ['group', 'group.teacher', 'group.course'],
    });

    for (const lesson of lessons) {
      const attendance = await this.attendanceRepository.findOne({
        where: { lesson: { id: lesson.id } },
      });

      if (!attendance) {
        const superAdmins = await this.superAdminRepository.find({
          where: { smsNotificationsEnabled: true },
        });
        for (const superAdmin of superAdmins) {
          if (superAdmin.phone) {
            const message = `Davomat qayd etilmadi: Guruh: ${lesson.group.name}, Kurs: ${lesson.group.course.name}, O'qituvchi: ${lesson.group.teacher.firstName} ${lesson.group.teacher.lastName}, Dars vaqti: ${lesson.lessonDate}, Yo'qlama hali kiritilmagan.`;
            await this.smsService.sendSMS(superAdmin.phone, message);
          }
        }
      }
    }
  }

  private async getFirstLessonDate(groupId: number): Promise<Date | null> {
    const lesson = await this.lessonRepository.findOne({
      where: { group: { id: groupId } },
      order: { lessonDate: 'ASC' },
    });
    return lesson ? lesson.lessonDate : null;
  }

  private calculatePaymentCycle(firstLessonDate: Date, currentDate: Date): { currentCycle: { startDate: Date; endDate: Date }; isFirstCycle: boolean } {
    const daysSinceFirstLesson = Math.floor(
      (currentDate.getTime() - firstLessonDate.getTime()) / (1000 * 60 * 60 * 24),
    );
    const cycleNumber = Math.floor(daysSinceFirstLesson / 30);
    const isFirstCycle = cycleNumber === 0;

    const startDate = new Date(firstLessonDate);
    startDate.setDate(startDate.getDate() + cycleNumber * 30);
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 30);

    return { currentCycle: { startDate, endDate }, isFirstCycle };
  }
}