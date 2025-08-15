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
    const { name, courseId, teacherId, students, startTime, endTime, daysOfWeek } = createGroupDto;

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
    });

    return this.groupRepository.save(group);
  }

  async addStudentToGroup(groupId: number, studentId: number): Promise<Group> {
    const group = await this.getGroupById(groupId);

    const student = await this.studentRepository.findOne({ where: { id: studentId } });
    if (!student) throw new NotFoundException('Student not found');

    if (group.students.some(s => s.id === studentId)) {
      throw new BadRequestException('Student already in group');
    }

    group.students.push(student);
    group.status = 'active';
    return this.groupRepository.save(group);
  }

  async removeStudentFromGroup(groupId: number, studentId: number): Promise<Group> {
    const group = await this.getGroupById(groupId);

    const inGroup = group.students.find(s => s.id === studentId);
    if (!inGroup) throw new NotFoundException('Student not found in group');

    group.students = group.students.filter(s => s.id !== studentId);
    if (group.students.length === 0) {
      group.status = 'completed';
    } else {
      group.status = 'frozen';
    }

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
    group.status = 'active';
    return this.groupRepository.save(group);
  }

  async getFrozenStudents(): Promise<Student[]> {
    const groups = await this.groupRepository.find({
      where: { status: 'frozen' },
      relations: ['students', 'course'],
    });

    const frozenStudents = [];
    for (const group of groups) {
      const unpaidStudents = await this.paymentRepository.find({
        where: { group: { id: group.id }, paid: false },
        relations: ['student'],
      });
      frozenStudents.push(
        ...unpaidStudents.map(payment => ({
          student: payment.student,
          group: { id: group.id, name: group.name, course: group.course },
        })),
      );
    }

    return frozenStudents.map(item => item.student);
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
    if (fromGroup.students.length === 0) {
      fromGroup.status = 'completed';
    }
    await this.groupRepository.save(fromGroup);

    toGroup.students.push(student);
    toGroup.status = 'active';
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

  async getGroupsByTeacherId(username: string): Promise<Group[]> {
    const teacher = await this.teacherRepository.findOne({ where: { username } });
    if (!teacher) throw new NotFoundException('Teacher not found');

    return this.groupRepository.find({
      where: { teacher: { id: teacher.id } },
      relations: ['course', 'students', 'teacher'],
    });
  }

  async getGroupsByStudentId(username: string): Promise<Group[]> {
    return this.groupRepository
      .createQueryBuilder('g')
      .leftJoinAndSelect('g.course', 'course')
      .leftJoinAndSelect('g.teacher', 'teacher')
      .leftJoinAndSelect('g.students', 'student')
      .where('student.username = :username', { username })
      .getMany();
  }

  async getStudentGroups(groupId: number): Promise<Student[]> {
    const group = await this.groupRepository.findOne({
      where: { id: groupId },
      relations: ['students'],
    });
    if (!group) throw new NotFoundException('Group not found');
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
      .leftJoinAndSelect('g.students', 'students');

    if (name) {
      qb.andWhere('g.name ILIKE :name', { name: `%${name}%` });
    }
    if (teacherName) {
      qb.andWhere('(teacher.firstName ILIKE :q OR teacher.lastName ILIKE :q)', { q: `%${teacherName}%` });
    }

    return qb.getMany();
  }

  async updateGroup(id: number, updateGroupDto: UpdateGroupDto): Promise<Group> {
    const group = await this.getGroupById(id);
    if (updateGroupDto.name) group.name = updateGroupDto.name;
    if (updateGroupDto.startTime) group.startTime = updateGroupDto.startTime;
    if (updateGroupDto.endTime) group.endTime = updateGroupDto.endTime;
    if (updateGroupDto.daysOfWeek) group.daysOfWeek = updateGroupDto.daysOfWeek;
    return this.groupRepository.save(group);
  }

  async deleteGroup(id: number): Promise<void> {
    const group = await this.getGroupById(id);
    await this.paymentRepository.delete({ group: { id } as any });
    await this.groupRepository.remove(group);
  }

  async getGroupsByCourseId(courseId: number): Promise<Group[]> {
    return this.groupRepository.find({
      where: { course: { id: courseId } },
      relations: ['course', 'teacher', 'students'],
    });
  }

  async getStudentsByGroupId(groupId: number): Promise<Student[]> {
    const group = await this.getGroupById(groupId);
    return group.students;
  }
}