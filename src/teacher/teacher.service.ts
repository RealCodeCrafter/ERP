import { Injectable, ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike, Between } from 'typeorm';
import { Teacher } from './entities/teacher.entity';
import { CreateTeacherDto } from './dto/create-teacher.dto';
import { UpdateTeacherDto } from './dto/update-teacher.dto';
import { Profile } from '../profile/entities/profile.entity';
import { Group } from '../groups/entities/group.entity';
import { Student } from '../students/entities/student.entity';
import { Attendance } from '../attendance/entities/attendance.entity';
import * as bcrypt from 'bcrypt';

@Injectable()
export class TeachersService {
  constructor(
    @InjectRepository(Teacher)
    private readonly teacherRepository: Repository<Teacher>,
    @InjectRepository(Profile)
    private readonly profileRepository: Repository<Profile>,
    @InjectRepository(Group)
    private readonly groupRepository: Repository<Group>,
    @InjectRepository(Student)
    private readonly studentRepository: Repository<Student>,
    @InjectRepository(Attendance)
    private readonly attendanceRepository: Repository<Attendance>,
  ) {}

  async createTeacher(createTeacherDto: CreateTeacherDto): Promise<Teacher> {
    const { phone, username, password, firstName, lastName, address, specialty } = createTeacherDto;

    const existingTeacher = await this.teacherRepository.findOne({ where: { phone } });
    if (existingTeacher) {
      throw new ConflictException(`Teacher with phone ${phone} already exists`);
    }

    const existingUsername = await this.teacherRepository.findOne({ where: { username } });
    if (existingUsername) {
      throw new ConflictException(`Username ${username} already exists`);
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const profile = this.profileRepository.create({
      firstName,
      lastName,
      username,
      password: hashedPassword,
      phone,
      address,
    });
    await this.profileRepository.save(profile);

    const teacher = this.teacherRepository.create({
      ...createTeacherDto,
      password: hashedPassword,
      profile,
    });

    return await this.teacherRepository.save(teacher);
  }

  async getAllTeachers(groupId?: number): Promise<Teacher[]> {
    const query: any = {};
    if (groupId) {
      query.groups = { id: groupId };
    }
    const teachers = await this.teacherRepository.find({ 
      where: query,
      relations: ['groups', 'groups.students', 'profile', 'attendances'] 
    });
    if (teachers.length === 0) {
      throw new NotFoundException('No teachers found');
    }
    return teachers;
  }

  async getTeacherById(id: number): Promise<Teacher> {
    if (isNaN(id)) {
      throw new BadRequestException('Invalid teacher ID');
    }
    const teacher = await this.teacherRepository.findOne({
      where: { id },
      relations: ['groups', 'groups.students', 'profile', 'attendances'],
    });
    if (!teacher) {
      throw new NotFoundException(`Teacher with ID ${id} not found`);
    }
    return teacher;
  }

  async getTeacherProfile(id: number): Promise<any> {
    const teacher = await this.teacherRepository.findOne({
      where: { id },
      relations: ['profile', 'groups', 'groups.students', 'groups.course'],
    });
    if (!teacher) {
      throw new NotFoundException(`Teacher with ID ${id} not found`);
    }
    const dayTranslations: { [key: string]: string } = {
      Monday: 'Dushanba',
      Tuesday: 'Seshanba',
      Wednesday: 'Chorshanba',
      Thursday: 'Payshanba',
      Friday: 'Juma',
      Saturday: 'Shanba',
      Sunday: 'Yakshanba',
    };

    const groups = teacher.groups.map(group => ({
      name: group.name,
      courseName: group.course.name,
      studentCount: group.students.length,
      schedule: group.daysOfWeek
        ? `${group.daysOfWeek.map(day => dayTranslations[day]).join(', ')} - ${group.startTime}-${group.endTime}`
        : `${group.startTime}-${group.endTime}`,
    }));

    return {
      id: teacher.id,
      firstName: teacher.firstName,
      lastName: teacher.lastName,
      phone: teacher.phone,
      address: teacher.address,
      specialty: teacher.specialty,
      groups,
    };
  }

  async updateTeacher(id: number, updateTeacherDto: UpdateTeacherDto): Promise<Teacher> {
    const teacher = await this.getTeacherById(id);

    const { phone, username, password, firstName, lastName, address, specialty } = updateTeacherDto;

    if (phone && phone !== teacher.phone) {
      const existingTeacher = await this.teacherRepository.findOne({ where: { phone } });
      if (existingTeacher && existingTeacher.id !== id) {
        throw new ConflictException(`Teacher with phone ${phone} already exists`);
      }
    }

    if (username && username !== teacher.username) {
      const existingUsername = await this.teacherRepository.findOne({ where: { username } });
      if (existingUsername && existingUsername.id !== id) {
        throw new ConflictException(`Username ${username} already exists`);
      }
    }

    if (password) {
      teacher.password = await bcrypt.hash(password, 10);
    }

    Object.assign(teacher, {
      firstName: firstName || teacher.firstName,
      lastName: lastName || teacher.lastName,
      phone: phone || teacher.phone,
      address: address || teacher.address,
      username: username || teacher.username,
      specialty: specialty || teacher.specialty,
    });

    const updatedTeacher = await this.teacherRepository.save(teacher);

    const profile = await this.profileRepository.findOne({ where: { teacher: { id } } });
    if (profile) {
      Object.assign(profile, {
        firstName: firstName || profile.firstName,
        lastName: lastName || profile.lastName,
        phone: phone || profile.phone,
        address: address || profile.address,
        username: username || profile.username,
        password: password ? await bcrypt.hash(password, 10) : profile.password,
      });
      await this.profileRepository.save(profile);
    }

    return updatedTeacher;
  }

  async deleteTeacher(id: number): Promise<void> {
    const teacher = await this.getTeacherById(id);
    await this.teacherRepository.remove(teacher);
  }

  async searchTeachers(name: string, groupId?: number): Promise<Teacher[]> {
    const query: any = {};
    if (name) {
      query.firstName = ILike(`%${name}%`);
    }
    if (groupId) {
      query.groups = { id: groupId };
    }
    const teachers = await this.teacherRepository.find({
      where: query,
      relations: ['groups', 'groups.students', 'profile', 'attendances'],
    });
    if (teachers.length === 0) {
      throw new NotFoundException(`No teachers found for name "${name}"`);
    }
    return teachers;
  }

  async getTeacherStatistics(groupId?: number): Promise<any[]> {
    const query: any = {};
    if (groupId) {
      query.groups = { id: groupId };
    }
    const teachers = await this.teacherRepository.find({
      where: query,
      relations: ['groups', 'groups.students', 'groups.attendances'],
    });

    return teachers.map(teacher => {
      const groupCount = teacher.groups.length;
      const studentCount = teacher.groups.reduce((sum, group) => sum + group.students.length, 0);
      const attendances = teacher.groups.flatMap(group => group.attendances || []);
      const totalAttendances = attendances.length;
      const presentCount = attendances.filter(att => att.status === 'present').length;
      const attendanceRate = totalAttendances > 0 ? (presentCount / totalAttendances) * 100 : 0;

      return {
        teacher,
        groupCount,
        studentCount,
        attendanceRate: Number(attendanceRate.toFixed(2)),
        totalAttendances,
        presentCount,
      };
    });
  }

    async getTeacherDashboardStats(teacherId: number): Promise<{
    totalGroups: number;
    newGroupsLastWeek: number;
    activeGroups: number;
    ongoingLessons: number;
    totalLessons: number;
    lessonsThisMonth: number;
  }> {


    const teacher = await this.teacherRepository.findOne({
      where: { id: teacherId },
      relations: ['groups', 'groups.lessons'],
    });
    if (!teacher) {
      throw new NotFoundException(`Teacher with ID ${teacherId} not found`);
    }

    const totalGroups = teacher.groups.length;
    const activeGroups = teacher.groups.filter(group => group.status === 'active').length;

    const lastWeek = new Date();
    lastWeek.setDate(lastWeek.getDate() - 7);
    const newGroupsLastWeek = teacher.groups.filter(
      group => group.createdAt && group.createdAt >= lastWeek,
    ).length;

    const now = new Date();
    const ongoingLessons = teacher.groups.reduce((count, group) => {
      const lessonsToday = group.lessons?.filter(lesson => {
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

    const totalLessons = teacher.groups.reduce(
      (count, group) => count + (group.lessons?.length || 0),
      0,
    );

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lessonsThisMonth = teacher.groups.reduce((count, group) => {
      const lessonsInMonth = group.lessons?.filter(
        lesson => lesson.lessonDate >= startOfMonth && lesson.lessonDate <= now,
      ).length || 0;
      return count + lessonsInMonth;
    }, 0);

    return {
      totalGroups,
      newGroupsLastWeek,
      activeGroups,
      ongoingLessons,
      totalLessons,
      lessonsThisMonth,
    };
  }

  async searchTeacherGroupsByName(
    teacherId: number,
    groupName?: string,
  ): Promise<any[]> {

    const teacher = await this.teacherRepository.findOne({
      where: { id: teacherId },
      relations: ['groups', 'groups.students', 'groups.lessons', 'groups.course'],
    });
    if (!teacher) {
      throw new NotFoundException(`Teacher with ID ${teacherId} not found`);
    }

    const dayTranslations: { [key: string]: string } = {
      Monday: 'Dushanba',
      Tuesday: 'Seshanba',
      Wednesday: 'Chorshanba',
      Thursday: 'Payshanba',
      Friday: 'Juma',
      Saturday: 'Shanba',
      Sunday: 'Yakshanba',
    };

    let groups = await this.groupRepository.find({
      where: { teacher: { id: teacherId } },
      relations: ['students', 'lessons', 'course'],
    });

    if (groupName && groupName.trim() !== '') {
      groups = groups.filter(group =>
        group.name.toLowerCase().includes(groupName.toLowerCase()),
      );
    }

    return groups.map(group => ({
      name: group.name,
      daysOfWeek: group.daysOfWeek
        ? group.daysOfWeek.map(day => dayTranslations[day]).join('\n')
        : 'N/A',
      time: group.startTime && group.endTime ? `${group.startTime} - ${group.endTime}` : 'N/A',
      studentCount: group.students?.length || 0,
      lessonCount: group.lessons?.length || 0,
    }));
  }
}