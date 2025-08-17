import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Group } from './entities/group.entity';
import { CreateGroupDto } from './dto/create-group.dto';
import { UpdateGroupDto } from './dto/update-group.dto';
import { Course } from '../courses/entities/course.entity';
import { Student } from '../students/entities/student.entity';
import { Teacher } from '../teacher/entities/teacher.entity';
import { Payment } from '../payment/entities/payment.entity';

@Injectable()
export class GroupsService {
  constructor(
    @InjectRepository(Group)
    private readonly groupRepository: Repository<Group>,
    @InjectRepository(Course)
    private readonly courseRepository: Repository<Course>,
    @InjectRepository(Student)
    private readonly studentRepository: Repository<Student>,
    @InjectRepository(Teacher)
    private readonly teacherRepository: Repository<Teacher>,
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
  ) {}

  async createGroup(createGroupDto: CreateGroupDto): Promise<Group> {
    const { name, courseId, teacherId, students, startTime, endTime, daysOfWeek, price } = createGroupDto;

    const course = await this.courseRepository.findOne({ where: { id: courseId } });
    if (!course) throw new BadRequestException('Course not found');

    const teacher = teacherId
      ? await this.teacherRepository.findOne({ where: { id: teacherId } })
      : null;
    if (teacherId && !teacher) throw new BadRequestException('Teacher not found');

    const studentIds = Array.isArray(students) ? [...new Set(students)] : [];
    const studentEntities = studentIds.length
      ? await this.studentRepository.findBy({ id: In(studentIds) })
      : [];

    const existingGroup = await this.groupRepository.findOne({
      where: { name, course: { id: courseId } },
      relations: ['course'],
    });
    if (existingGroup) {
      throw new BadRequestException('Group with the same name already exists for this course');
    }

    const group = this.groupRepository.create({
      name,
      course,
      teacher,
      students: studentEntities,
      status: 'active',
      startTime,
      endTime,
      daysOfWeek,
      price,
    });

    return this.groupRepository.save(group);
  }

  async addStudentToGroup(groupId: number, studentId: number): Promise<Group> {
    const group = await this.groupRepository.findOne({
      where: { id: groupId, status: 'active' },
      relations: ['students'],
    });
    if (!group) throw new NotFoundException('Active group not found');

    const student = await this.studentRepository.findOne({ where: { id: studentId } });
    if (!student) throw new NotFoundException('Student not found');

    if (group.students.some(s => s.id === studentId)) {
      throw new BadRequestException('Student already in group');
    }

    group.students.push(student);
    return this.groupRepository.save(group);
  }

  async restoreStudentToGroup(groupId: number, studentId: number): Promise<Group> {
    const group = await this.getGroupById(groupId);

    const student = await this.studentRepository.findOne({ where: { id: studentId } });
    if (!student) throw new NotFoundException('Student not found');

    if (group.students.some(s => s.id === studentId)) {
      throw new BadRequestException('Student already in group');
    }

    const payment = await this.paymentRepository.findOne({
      where: { student: { id: studentId }, group: { id: groupId }, paid: true },
      order: { createdAt: 'DESC' },
    });
    if (!payment) {
      throw new BadRequestException('No active payment found for this student in the group');
    }

    group.students.push(student);
    return this.groupRepository.save(group);
  }

  async transferStudentToGroup(fromGroupId: number, toGroupId: number, studentId: number): Promise<Group> {
    if (fromGroupId === toGroupId) {
      throw new BadRequestException('Source and target groups are the same');
    }

    const fromGroup = await this.getGroupById(fromGroupId);
    const toGroup = await this.getGroupById(toGroupId);

    const student = await this.studentRepository.findOne({ where: { id: studentId } });
    if (!student) throw new NotFoundException('Student not found');

    if (!fromGroup.students.some(s => s.id === studentId)) {
      throw new BadRequestException('Student not found in source group');
    }
    if (toGroup.students.some(s => s.id === studentId)) {
      throw new BadRequestException('Student already in target group');
    }

    fromGroup.students = fromGroup.students.filter(s => s.id !== studentId);
    await this.groupRepository.save(fromGroup);

    toGroup.students.push(student);
    return this.groupRepository.save(toGroup);
  }

  async getGroupById(id: number): Promise<Group> {
    const group = await this.groupRepository.findOne({
      where: { id },
      relations: ['course', 'teacher', 'students'],
    });
    if (!group) throw new NotFoundException('Group not found');
    return group;
  }

  async getGroupsByTeacherId(teacherId: number): Promise<any> {
  const groups = await this.groupRepository.find({
    where: { teacher: { id: teacherId }, status: 'active' },
    relations: ['students', 'lessons', 'course'],
  });

  if (!groups.length) {
    throw new NotFoundException('No groups found for this teacher');
  }

  const now = new Date();
  const lastWeek = new Date();
  lastWeek.setDate(now.getDate() - 7);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const totalGroups = groups.length;
  const activeGroups = groups.filter(g => g.status === 'active').length;
  const newGroupsLastWeek = groups.filter(
    g => g.createdAt && g.createdAt >= lastWeek,
  ).length;

  const ongoingLessons = groups.reduce((count, group) => {
    const lessonsToday =
      group.lessons?.filter(lesson => {
        const lessonDate = new Date(lesson.lessonDate);
        return (
          lessonDate.toDateString() === now.toDateString() &&
          group.startTime &&
          group.endTime &&
          now >= new Date(`${lessonDate.toISOString().split('T')[0]}T${group.startTime}:00`) &&
          now <= new Date(`${lessonDate.toISOString().split('T')[0]}T${group.endTime}:00`)
        );
      }).length || 0;
    return count + lessonsToday;
  }, 0);

  const totalLessons = groups.reduce(
    (count, g) => count + (g.lessons?.length || 0),
    0,
  );

  const lessonsThisMonth = groups.reduce((count, g) => {
    const lessonsInMonth =
      g.lessons?.filter(
        lesson => lesson.lessonDate >= startOfMonth && lesson.lessonDate <= now,
      ).length || 0;
    return count + lessonsInMonth;
  }, 0);

  const dayTranslations: { [key: string]: string } = {
    Monday: 'Dushanba',
    Tuesday: 'Seshanba',
    Wednesday: 'Chorshanba',
    Thursday: 'Payshanba',
    Friday: 'Juma',
    Saturday: 'Shanba',
    Sunday: 'Yakshanba',
  };

  return {
    stats: {
      totalGroups,
      newGroupsLastWeek,
      activeGroups,
      ongoingLessons,
      totalLessons,
      lessonsThisMonth,
    },
    groups: groups.map(g => ({
      id: g.id,
      name: g.name,
      course: g.course?.name || 'N/A',
      studentCount: g.students?.length || 0,
      lessonCount: g.lessons?.length || 0,
      daysOfWeek: g.daysOfWeek
        ? g.daysOfWeek.map(day => dayTranslations[day]).join(', ')
        : 'N/A',
      time: g.startTime && g.endTime ? `${g.startTime} - ${g.endTime}` : 'N/A',
    })),
  };
}


  async getGroupsByStudentId(username: string): Promise<Group[]> {
    return this.groupRepository
      .createQueryBuilder('g')
      .leftJoinAndSelect('g.course', 'course')
      .leftJoinAndSelect('g.teacher', 'teacher')
      .leftJoinAndSelect('g.students', 'student')
      .where('student.username = :username', { username })
      .andWhere('g.status = :status', { status: 'active' })
      .getMany();
  }

  async getStudentGroups(groupId: number): Promise<Student[]> {
    const group = await this.groupRepository.findOne({
      where: { id: groupId, status: 'active' },
      relations: ['students'],
    });
    if (!group) throw new NotFoundException('Active group not found');
    return group.students;
  }

  async getAllGroupsForAdmin(): Promise<Group[]> {
    return this.groupRepository.find({
      relations: ['course', 'teacher', 'students'],
    });
  }

  async searchGroups(name?: string, teacherName?: string): Promise<Group[]> {
    const qb = this.groupRepository
      .createQueryBuilder('g')
      .leftJoinAndSelect('g.course', 'course')
      .leftJoinAndSelect('g.teacher', 'teacher')
      .leftJoinAndSelect('g.students', 'students')
      .where('g.status = :status', { status: 'active' });

    if (name) {
      qb.andWhere('g.name ILIKE :name', { name: `%${name}%` });
    }
    if (teacherName) {
      qb.andWhere('(teacher.firstName ILIKE :q OR teacher.lastName ILIKE :q)', { q: `%${teacherName}%` });
    }

    return qb.getMany();
  }

  async removeStudentFromGroup(groupId: number, studentId: number): Promise<Group> {
    const group = await this.getGroupById(groupId);

    const inGroup = group.students.find(s => s.id === studentId);
    if (!inGroup) throw new NotFoundException('Student not found in group');

    group.students = group.students.filter(s => s.id !== studentId);
    return this.groupRepository.save(group);
  }

  async updateGroup(id: number, updateGroupDto: UpdateGroupDto): Promise<Group> {
    const group = await this.getGroupById(id);

    if (updateGroupDto.name) group.name = updateGroupDto.name;
    if (updateGroupDto.price !== undefined) group.price = updateGroupDto.price;
    if (updateGroupDto.startTime) group.startTime = updateGroupDto.startTime;
    if (updateGroupDto.endTime) group.endTime = updateGroupDto.endTime;
    if (updateGroupDto.daysOfWeek) group.daysOfWeek = updateGroupDto.daysOfWeek;
    if (updateGroupDto.status) group.status = updateGroupDto.status;

    if (updateGroupDto.courseId) {
      const course = await this.courseRepository.findOne({ where: { id: updateGroupDto.courseId } });
      if (!course) throw new NotFoundException('Course not found');
      group.course = course;
    }

    if (updateGroupDto.teacherId) {
      const teacher = await this.teacherRepository.findOne({ where: { id: updateGroupDto.teacherId } });
      if (!teacher) throw new NotFoundException('Teacher not found');
      group.teacher = teacher;
    }

    if (updateGroupDto.studentIds !== undefined) {
      const studentIds = updateGroupDto.studentIds ?? [];
      const students = await this.studentRepository.findBy({ id: In(studentIds) });
      if (students.length !== studentIds.length) {
        throw new NotFoundException('One or more students not found');
      }
      group.students = students;
    }

    return this.groupRepository.save(group);
  }

  async deleteGroup(id: number): Promise<void> {
    const group = await this.getGroupById(id);
    await this.paymentRepository.delete({ group: { id } as any });
    await this.groupRepository.remove(group);
  }

  async getGroupsByCourseId(courseId: number): Promise<Group[]> {
    return this.groupRepository.find({
      where: { course: { id: courseId }, status: 'active' },
      relations: ['course', 'teacher', 'students'],
    });
  }

  async getStudentsByGroupId(groupId: number): Promise<Student[]> {
    const group = await this.getGroupById(groupId);
    return group.students;
  }
}