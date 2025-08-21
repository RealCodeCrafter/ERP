import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Lesson } from './entities/lesson.entity';
import { Group } from '../groups/entities/group.entity';
import { Attendance } from '../attendance/entities/attendance.entity';
import { CreateLessonDto } from './dto/create-lesson.dto';
import { UpdateLessonDto } from './dto/update-lesson.dto';
import { Teacher } from '../teacher/entities/teacher.entity';
import { Student } from '../students/entities/student.entity';
import * as moment from 'moment-timezone';

@Injectable()
export class LessonsService {
  constructor(
    @InjectRepository(Lesson)
    private readonly lessonRepository: Repository<Lesson>,
    @InjectRepository(Group)
    private readonly groupRepository: Repository<Group>,
    @InjectRepository(Teacher)
    private readonly teacherRepository: Repository<Teacher>,
    @InjectRepository(Student)
    private readonly studentRepository: Repository<Student>,
    @InjectRepository(Attendance)
    private readonly attendanceRepository: Repository<Attendance>,
  ) {}

  private async getUserById(userId: number): Promise<Teacher | Student> {
    const user = await this.teacherRepository.findOne({ where: { id: userId } }) ||
      await this.studentRepository.findOne({ where: { id: userId } });

    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async create(userId: number, lessonData: CreateLessonDto): Promise<Lesson> {
    const user = await this.getUserById(userId);

    const group = await this.groupRepository.findOne({
      where: { id: lessonData.groupId },
      relations: ['teacher', 'students', 'course'],
    });

    if (!group) throw new NotFoundException('Group not found');

    // Faqat teacher dars yarata oladi
    if (!('firstName' in user) || group.teacher?.id !== user.id) {
      throw new ForbiddenException('Only the assigned teacher can create a lesson for this group');
    }

    // Guruhdagi mavjud darslar sonini hisoblash
    const lessonCount = await this.lessonRepository.count({
      where: { group: { id: lessonData.groupId } },
    });

    // Joriy sanani va vaqtni olish (Toshkent vaqti, UTC+05:00)
    const now = moment().utcOffset('+05:00');
    const targetDate = now.clone().startOf('day');
    const dayOfWeek = now.format('dddd');

    // Bugun guruhning dars kuni ekanligini tekshirish
    if (!group.daysOfWeek.includes(dayOfWeek)) {
      throw new BadRequestException(
        `Today (${dayOfWeek}) is not a valid lesson day for group ${group.name}. Valid days: ${group.daysOfWeek.join(', ')}`,
      );
    }

    // lessonDate ni joriy vaqt sifatida o‘rnatish
    const lessonDate = now.toDate();

    // endDate ni guruhning startTime va endTime asosida hisoblash
    let endDate: Date | null = null;
    if (group.startTime && group.endTime) {
      const startTime = moment(`${targetDate.format('YYYY-MM-DD')} ${group.startTime}`, 'YYYY-MM-DD HH:mm').utcOffset('+05:00');
      const endTime = moment(`${targetDate.format('YYYY-MM-DD')} ${group.endTime}`, 'YYYY-MM-DD HH:mm').utcOffset('+05:00');

      // Dars davomiyligini hisoblash (soatlarda)
      const duration = endTime.diff(startTime, 'hours', true);

      // endDate ni lessonDate ga davomiylik qo‘shib hisoblash
      endDate = moment(lessonDate).add(duration, 'hours').toDate();
    } else {
      // Agar startTime yoki endTime bo‘lmasa, default 2 soatlik dars davomiyligi
      endDate = moment(lessonDate).add(2, 'hours').toDate();
    }

    const lesson = this.lessonRepository.create({
      lessonName: lessonData.lessonName,
      lessonNumber: lessonCount + 1,
      lessonDate,
      endDate,
      group,
    });

    return this.lessonRepository.save(lesson);
  }

  async getAll(userId: number) {
    await this.getUserById(userId);
    return this.lessonRepository.find({ relations: ['group', 'group.course', 'group.teacher'] });
  }

  async findLessonsByGroup(groupId: number, userId: number, date?: string) {
    const user = await this.getUserById(userId);

    const group = await this.groupRepository.findOne({
      where: { id: groupId },
      relations: ['teacher', 'students', 'course'],
    });

    if (!group) throw new NotFoundException('Group not found');

    const isTeacher = group.teacher?.id === user.id;
    const isStudent = group.students.some(student => student.id === user.id);

    if (!isTeacher && !isStudent) {
      throw new ForbiddenException('You can only view lessons in your own group');
    }

    const query: any = { group: { id: groupId } };
    if (date) {
      const startDate = new Date(date);
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 1);
      query.lessonDate = Between(startDate, endDate);
    }

    return this.lessonRepository.find({
      where: query,
      relations: ['group', 'group.course', 'group.teacher', 'attendances', 'attendances.student'],
    });
  }

  async update(id: number, updateLessonDto: UpdateLessonDto, userId: number) {
    const user = await this.getUserById(userId);

    const lesson = await this.lessonRepository.findOne({
      where: { id },
      relations: ['group', 'group.teacher'],
    });

    if (!lesson) {
      throw new NotFoundException(`Lesson with ID ${id} not found`);
    }

    if (lesson.group.teacher?.id !== user.id) {
      throw new ForbiddenException('You can only update lessons in your own group');
    }

    const updatedLesson = await this.lessonRepository.save({
      ...lesson,
      lessonName: updateLessonDto.lessonName || lesson.lessonName,
    });

    return updatedLesson;
  }

  async remove(id: number, userId: number) {
    const user = await this.getUserById(userId);

    const lesson = await this.lessonRepository.findOne({
      where: { id },
      relations: ['group', 'group.teacher'],
    });

    if (!lesson) {
      throw new NotFoundException(`Lesson with ID ${id} not found`);
    }

    if (lesson.group.teacher?.id !== user.id) {
      throw new ForbiddenException('You can only delete lessons from your own group');
    }

    await this.lessonRepository.delete(id);
    return { message: `Lesson with ID ${id} successfully deleted` };
  }

  async getLessonStatistics(groupId?: number, date?: string) {
    const query: any = {};
    if (groupId) {
      query.group = { id: groupId };
    }
    if (date) {
      const startDate = new Date(date);
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 1);
      query.lessonDate = Between(startDate, endDate);
    }

    const lessons = await this.lessonRepository.find({
      where: query,
      relations: ['group', 'group.teacher', 'group.course', 'attendances', 'attendances.student'],
    });

    return lessons.map(lesson => {
      const totalAttendances = lesson.attendances.length;
      const presentCount = lesson.attendances.filter(att => att.status === 'present').length;
      const attendanceRate = totalAttendances > 0 ? (presentCount / totalAttendances) * 100 : 0;

      return {
        lesson,
        group: lesson.group,
        teacher: lesson.group.teacher,
        course: lesson.group.course,
        totalStudents: lesson.group.students.length,
        presentCount,
        attendanceRate: Number(attendanceRate.toFixed(2)),
      };
    });
  }

  async getAttendanceHistoryByLesson(lessonId: number, userId: number): Promise<any> {
    const user = await this.getUserById(userId);

    const lesson = await this.lessonRepository.findOne({
      where: { id: lessonId },
      relations: ['group', 'group.teacher', 'group.students', 'attendances', 'attendances.student'],
    });

    if (!lesson) {
      throw new NotFoundException(`Lesson with ID ${lessonId} not found`);
    }

    const isTeacher = lesson.group.teacher?.id === user.id;
    const isStudent = lesson.group.students.some(student => student.id === user.id);

    if (!isTeacher && !isStudent) {
      throw new ForbiddenException('You can only view attendance history for lessons in your own group');
    }

    const attendances = await this.attendanceRepository
      .createQueryBuilder('attendance')
      .leftJoinAndSelect('attendance.student', 'student')
      .leftJoinAndSelect('attendance.lesson', 'lesson')
      .leftJoinAndSelect('lesson.group', 'group')
      .where('attendance.lessonId = :lessonId', { lessonId })
      .orderBy('student.firstName', 'ASC')
      .getMany();

    const filteredAttendances = isStudent
      ? attendances.filter(attendance => attendance.student.id === user.id)
      : attendances;

    const totalStudents = filteredAttendances.length;
    const presentCount = filteredAttendances.filter(a => a.status === 'present').length;
    const absentCount = filteredAttendances.filter(a => a.status === 'absent').length;
    const lateCount = filteredAttendances.filter(a => a.status === 'late').length;

    return {
      statistics: {
        totalStudents: totalStudents,
        present: presentCount,
        absent: absentCount,
        late: lateCount,
      },
      date: filteredAttendances.length > 0 
        ? filteredAttendances[0].createdAt.toISOString().split('T')[0]
        : lesson.lessonDate.toISOString().split('T')[0],
      exportable: true,
      students: filteredAttendances.map((attendance, index) => ({
        studentId: attendance.student.id,
        studentName: `${attendance.student.firstName} ${attendance.student.lastName}`,
        phone: attendance.student.phone,
        groupName: lesson.group.name,
        status: attendance.status === 'present' ? 'present' : attendance.status === 'absent' ? 'absent' : 'late',
      })),
    };
  }
}