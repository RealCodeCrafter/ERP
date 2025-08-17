import { Injectable, ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository, ILike, In, Raw } from 'typeorm';
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
import * as moment from 'moment';

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

  async bulkUpdateByLesson(
  lessonId: number,
  updateAttendanceDto: UpdateAttendanceDto,
  teacherId: number,
) {
  const teacher = await this.teacherRepository.findOne({ where: { id: teacherId } });
  if (!teacher) {
    throw new NotFoundException('Teacher not found');
  }

  const lesson = await this.lessonRepository.findOne({
    where: { id: lessonId },
    relations: ['group', 'group.teacher'],
  });
  if (!lesson) {
    throw new NotFoundException(`Lesson with ID ${lessonId} not found`);
  }

  if (lesson.group.teacher.id !== teacherId) {
    throw new ForbiddenException('You can only update attendance for your own group');
  }

  const results = [];
  for (const aDto of updateAttendanceDto.attendances) {
    const student = await this.studentRepository.findOne({ where: { id: aDto.studentId } });
    if (!student) {
      throw new NotFoundException(`Student with ID ${aDto.studentId} not found`);
    }

    if (!['present', 'absent', 'late'].includes(aDto.status)) {
      throw new BadRequestException(`Invalid status for student ID ${aDto.studentId}`);
    }

    const studentAttendance = await this.attendanceRepository.findOne({
      where: {
        lesson: { id: lessonId },
        student: { id: aDto.studentId },
      },
      relations: ['student', 'lesson'],
    });

    if (!studentAttendance) {
      throw new NotFoundException(
        `Attendance record not found for student ID ${aDto.studentId} in lesson ID ${lessonId}`,
      );
    }

    studentAttendance.status = aDto.status;
    studentAttendance.teacher = teacher;

    const updated = await this.attendanceRepository.save(studentAttendance);
    results.push(updated);
  }

  return results;
}

async getGroupsWithoutAttendance(date: string) {
  const dayOfWeek = moment(date).format('dddd'); // Masalan: "Friday"

  const groups = await this.groupRepository.find({
    where: { status: 'active' },
    relations: ['teacher', 'lessons', 'attendances'],
  });

  const results = [];

  for (const group of groups) {
    if (!group.daysOfWeek?.includes(dayOfWeek)) {
      continue; // jadvalida bu kun bo‘lmasa tashlab ketamiz
    }

    const lesson = group.lessons.find(l =>
      moment(l.lessonDate).isSame(date, 'day'),
    );

    // 🔹 Lesson topilmagan bo‘lsa
    if (!lesson) {
      results.push({
        groupName: group.name,
        date,
        lessonName: 'yaratilmagan',
        lessonTime: `${group.startTime} - ${group.endTime}`,
        teacher: group.teacher
          ? `${group.teacher.firstName} ${group.teacher.lastName}`
          : null,
        phone: group.teacher?.phone,
        reason: 'Lesson not created',
      });
      continue;
    }

    // 🔹 Attendance yozilmagan bo‘lsa
    const attendance = lesson.attendances?.length > 0;

    if (!attendance) {
      results.push({
        groupName: group.name,
        date,
        lessonName: lesson.lessonName ?? 'yaratilmagan',
        lessonTime: `${moment(lesson.lessonDate).format('HH:mm')} - ${moment(lesson.endDate).format('HH:mm')}`,
        teacher: group.teacher
          ? `${group.teacher.firstName} ${group.teacher.lastName}`
          : null,
        phone: group.teacher?.phone,
        reason: 'Attendance not created',
      });
    }
  }

  return results;
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
    const currentTime = now.toTimeString().slice(0, 5); // Joriy vaqt HH:mm formatida
    const fifteenMinutesAgo = new Date(now.getTime() - 15 * 60 * 1000);
    const currentDay = now.toLocaleString('en-US', { weekday: 'long' }); // Joriy kun, masalan "Monday"

    const lessons = await this.lessonRepository.find({
      where: {
        lessonDate: Between(fifteenMinutesAgo, now),
      },
      relations: ['group', 'group.teacher', 'group.course'],
    });

    for (const lesson of lessons) {
      const group = await this.groupRepository.findOne({
        where: { id: lesson.group.id },
        relations: ['course', 'teacher'],
      });
      if (!group.startTime || !group.daysOfWeek || !group.daysOfWeek.includes(currentDay)) {
        continue; // Agar startTime yoki daysOfWeek yo'q bo'lsa yoki bugun dars kuni bo'lmasa, o'tkazib yuboriladi
      }

      const lessonDate = new Date(lesson.lessonDate);
      const lessonStartTime = group.startTime;
      const lessonStartDateTime = new Date(
        `${lessonDate.toISOString().split('T')[0]}T${lessonStartTime}:00.000Z`,
      );
      const lessonEndDateTime = new Date(
        `${lessonDate.toISOString().split('T')[0]}T${group.endTime}:00.000Z`,
      );

      // Dars boshlangan va 15 daqiqa o'tgan bo'lsa
      if (
        now >= lessonStartDateTime &&
        now <= new Date(lessonStartDateTime.getTime() + 15 * 60 * 1000) &&
        lessonStartDateTime <= now
      ) {
        const attendance = await this.attendanceRepository.findOne({
          where: { lesson: { id: lesson.id } },
        });

        if (!attendance) {
          const superAdmins = await this.superAdminRepository.find({
            where: { smsNotificationsEnabled: true },
          });
          for (const superAdmin of superAdmins) {
            if (superAdmin.phone) {
              const message = `Davomat qayd etilmadi: Guruh: ${group.name}, Kurs: ${group.course.name}, O'qituvchi: ${group.teacher.firstName} ${group.teacher.lastName}, Dars vaqti: ${lesson.lessonDate.toLocaleDateString('uz-UZ')} ${group.startTime}, Yo'qlama hali kiritilmagan.`;
              await this.smsService.sendSMS(superAdmin.phone, message);
            }
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

  async getAttendanceReport(
    groupId: number,
    date?: string,
    period?: 'daily' | 'weekly' | 'monthly',
    studentName?: string,
  ): Promise<{ attendances: any[] }> {
    const group = await this.groupRepository.findOne({ where: { id: groupId, status: 'active' } });
    if (!group) {
      throw new NotFoundException(`Active group with ID ${groupId} not found`);
    }

    const query: any = {
      lesson: { group: { id: groupId } },
    };

    if (date && period) {
      const startDate = new Date(date);
      if (isNaN(startDate.getTime())) {
        throw new BadRequestException('Invalid date format. Use YYYY-MM-DD');
      }
      let endDate = new Date(startDate);

      if (period === 'daily') {
        endDate.setDate(startDate.getDate() + 1);
      } else if (period === 'weekly') {
        endDate.setDate(startDate.getDate() + 7);
      } else if (period === 'monthly') {
        endDate.setMonth(startDate.getMonth() + 1);
      } else {
        throw new BadRequestException('Invalid period. Use "daily", "weekly", or "monthly"');
      }

      query.lesson.lessonDate = Between(startDate, endDate);
    }

    // StudentName bo'yicha filtr
    if (studentName && studentName.trim() !== '') {
      query.student = [
        { firstName: ILike(`%${studentName.trim()}%`) },
        { lastName: ILike(`%${studentName.trim()}%`) },
      ];
    }

    const attendances = await this.attendanceRepository.find({
      where: query,
      relations: ['student', 'lesson', 'lesson.group', 'lesson.group.course', 'lesson.group.teacher'],
      order: { createdAt: 'DESC' },
    });

    const formattedAttendances = attendances.map((attendance) => ({
      studentId: attendance.student.id,
      student: `${attendance.student.firstName} ${attendance.student.lastName}`,
      group: attendance.lesson.group.name,
      course: attendance.lesson.group.course.name,
      time: attendance.lesson.lessonDate
        ? `${attendance.lesson.lessonDate.toISOString().split('T')[0]} ${attendance.lesson.group.startTime || 'N/A'}`
        : 'N/A',
      teacher: `${attendance.lesson.group.teacher.firstName} ${attendance.lesson.group.teacher.lastName}`,
      status: attendance.status === 'present' ? 'present' : attendance.status === 'absent' ? 'absent' : 'late',
    }));

    return {
      attendances: formattedAttendances,
    };
  }

  async getDailyAttendanceStats(): Promise<{
    totalStudents: number;
    present: number;
    absent: number;
    late: number;
  }> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const currentDay = today.toLocaleString('en-US', { weekday: 'long' });

    const groups = await this.groupRepository
      .createQueryBuilder('group')
      .where('group.status = :status', { status: 'active' })
      .andWhere(':currentDay = ANY("group"."daysOfWeek")', { currentDay })
      .leftJoinAndSelect('group.students', 'students')
      .getMany();

    if (groups.length === 0) {
      return { totalStudents: 0, present: 0, absent: 0, late: 0 };
    }

    let totalStudents = 0;
    for (const group of groups) {
      if (group.daysOfWeek && group.daysOfWeek.includes(currentDay)) {
        totalStudents += group.students.length;
      }
    }

    const attendances = await this.attendanceRepository.find({
      where: {
        lesson: {
          group: { id: In(groups.map(g => g.id)) },
          lessonDate: Between(today, tomorrow),
        },
      },
      relations: ['student', 'lesson', 'lesson.group'],
    });

    const present = attendances.filter(a => a.status === 'present').length;
    const absent = attendances.filter(a => a.status === 'absent').length;
    const late = attendances.filter(a => a.status === 'late').length;

    return {
      totalStudents,
      present,
      absent,
      late,
    };
  }
}