import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Lesson } from './entities/lesson.entity';
import { Group } from '../groups/entities/group.entity';
import { Attendance } from '../attendance/entities/attendance.entity';
import { CreateLessonDto } from './dto/create-lesson.dto';
import { UpdateLessonDto } from './dto/update-lesson.dto';
import { Teacher } from '../teacher/entities/teacher.entity';
import { Student } from '../students/entities/student.entity';

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

    const isTeacher = group.teacher.id === user.id;
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

  async create(userId: number, lessonData: CreateLessonDto) {
    const user = await this.getUserById(userId);

    const group = await this.groupRepository.findOne({
      where: { id: lessonData.groupId },
      relations: ['teacher', 'students', 'course'],
    });

    if (!group) throw new NotFoundException('Group not found');

    if (group.teacher?.id !== user.id) {
      throw new ForbiddenException('You are not assigned to this group');
    }

    const lesson = this.lessonRepository.create({
      lessonName: lessonData.lessonName,
      lessonNumber: lessonData.lessonNumber,
      lessonDate: new Date(),
      endDate: lessonData.endDate ? new Date(lessonData.endDate) : null,
      group,
    });

    return this.lessonRepository.save(lesson);
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
      lessonNumber: updateLessonDto.lessonNumber || lesson.lessonNumber,
      endDate: updateLessonDto.endDate ? new Date(updateLessonDto.endDate) : lesson.endDate,
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
}