import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import { Student } from './entities/student.entity';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import { Group } from '../groups/entities/group.entity';
import { Profile } from '../profile/entities/profile.entity';
import { Attendance } from '../attendance/entities/attendance.entity';
import { Payment } from '../payment/entities/payment.entity';
import * as bcrypt from 'bcrypt';

@Injectable()
export class StudentsService {
  constructor(
    @InjectRepository(Student)
    private readonly studentRepository: Repository<Student>,
    @InjectRepository(Group)
    private readonly groupRepository: Repository<Group>,
    @InjectRepository(Profile)
    private readonly profileRepository: Repository<Profile>,
    @InjectRepository(Attendance)
    private readonly attendanceRepository: Repository<Attendance>,
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
  ) {}

  async getAllStudents(): Promise<Student[]> {
    const students = await this.studentRepository.find({
      relations: ['groups', 'groups.course', 'profile', 'payments'],
    });
    if (students.length === 0) {
      throw new NotFoundException('No students found');
    }
    return students;
  }

  async getActiveStudents(name: string, groupId: number): Promise<Student[]> {
    const query: any = { groups: { status: 'active' } };
    if (name) {
      query.firstName = ILike(`%${name}%`);
    }
    if (groupId) {
      query.groups = { id: groupId, status: 'active' };
    }
    const students = await this.studentRepository.find({
      where: query,
      relations: ['groups', 'groups.course', 'profile', 'payments'],
    });
    if (students.length === 0) {
      throw new NotFoundException('No active students found');
    }
    return students;
  }

  async getGraduatedStudents(name: string, groupId: number): Promise<Student[]> {
    const query: any = { groups: { status: 'completed' } };
    if (name) {
      query.firstName = ILike(`%${name}%`);
    }
    if (groupId) {
      query.groups = { id: groupId, status: 'completed' };
    }
    const students = await this.studentRepository.find({
      where: query,
      relations: ['groups', 'groups.course', 'profile', 'payments'],
    });
    if (students.length === 0) {
      throw new NotFoundException('No graduated students found');
    }
    return students;
  }

  async getPaidStudents(name: string, groupId: number): Promise<Student[]> {
    const query: any = { payments: { paid: true } };
    if (name) {
      query.firstName = ILike(`%${name}%`);
    }
    if (groupId) {
      query.groups = { id: groupId };
    }
    const students = await this.studentRepository.find({
      where: query,
      relations: ['groups', 'groups.course', 'profile', 'payments'],
    });
    if (students.length === 0) {
      throw new NotFoundException('No students with paid status found');
    }
    return students;
  }

  async getUnpaidStudents(name: string, groupId: number): Promise<Student[]> {
    const query: any = { payments: { paid: false } };
    if (name) {
      query.firstName = ILike(`%${name}%`);
    }
    if (groupId) {
      query.groups = { id: groupId };
    }
    const students = await this.studentRepository.find({
      where: query,
      relations: ['groups', 'groups.course', 'profile', 'payments'],
    });
    if (students.length === 0) {
      throw new NotFoundException('No students with unpaid status found');
    }
    return students;
  }

  async getStudentById(id: number): Promise<Student> {
    const student = await this.studentRepository.findOne({
      where: { id },
      relations: ['groups', 'groups.course', 'profile', 'payments'],
    });
    if (!student) {
      throw new NotFoundException(`Student with ID ${id} not found`);
    }
    return student;
  }

  async searchStudents(name: string): Promise<Student[]> {
    const students = await this.studentRepository.find({
      where: [
        { firstName: ILike(`%${name}%`) },
        { lastName: ILike(`%${name}%`) },
        { parentsName: ILike(`%${name}%`) },
      ],
      relations: ['groups', 'groups.course', 'profile', 'payments'],
    });

    if (students.length === 0) {
      throw new NotFoundException(`No students found for name "${name}"`);
    }
    return students;
  }

  async createStudent(createStudentDto: CreateStudentDto): Promise<Student> {
    const { phone, username, password, groupId, firstName, lastName, address, parentsName, parentPhone } = createStudentDto;

    const existingStudent = await this.studentRepository.findOne({ where: { phone } });
    if (existingStudent) {
      throw new NotFoundException(`Student with phone ${phone} already exists`);
    }

    if (username) {
      const existingUsername = await this.studentRepository.findOne({ where: { username } });
      if (existingUsername) {
        throw new NotFoundException(`Username ${username} already exists`);
      }
    }

    const hashedPassword = password ? await bcrypt.hash(password, 10) : null;

    const group = await this.groupRepository.findOne({ where: { id: groupId }, relations: ['course'] });
    if (!group) {
      throw new NotFoundException(`Group with ID ${groupId} not found`);
    }

    const profile = this.profileRepository.create({
      firstName,
      lastName,
      username,
      password: hashedPassword,
      address,
      phone,
      parentsName,
      parentPhone,
    });

    const savedProfile = await this.profileRepository.save(profile);

    const student = this.studentRepository.create({
      firstName,
      lastName,
      phone,
      address,
      username,
      password: hashedPassword,
      parentsName,
      parentPhone,
      groups: [group],
      role: 'student',
      profile: savedProfile,
    });

    return await this.studentRepository.save(student);
  }

  async updateStudent(id: number, updateStudentDto: UpdateStudentDto): Promise<Student> {
    const student = await this.getStudentById(id);

    const { groupId, parentsName, parentPhone, firstName, lastName, phone, address, username, password } = updateStudentDto;

    if (groupId) {
      const group = await this.groupRepository.findOne({
        where: { id: groupId },
        relations: ['course'],
      });
      if (!group) {
        throw new NotFoundException(`Group with ID ${groupId} not found`);
      }
      student.groups = [group];
    }

    if (username) {
      const existingUsername = await this.studentRepository.findOne({ where: { username } });
      if (existingUsername && existingUsername.id !== id) {
        throw new NotFoundException(`Username ${username} already exists`);
      }
    }

    if (phone) {
      const existingStudent = await this.studentRepository.findOne({ where: { phone } });
      if (existingStudent && existingStudent.id !== id) {
        throw new NotFoundException(`Student with phone ${phone} already exists`);
      }
    }

    if (password) {
      student.password = await bcrypt.hash(password, 10);
    } else if (updateStudentDto.password === null) {
      student.password = null;
    }

    Object.assign(student, {
      firstName: firstName || student.firstName,
      lastName: lastName || student.lastName,
      phone: phone || student.phone,
      address: address || student.address,
      username: username !== undefined ? username : student.username,
      parentsName: parentsName !== undefined ? parentsName : student.parentsName,
      parentPhone: parentPhone !== undefined ? parentPhone : student.parentPhone,
    });

    const updatedStudent = await this.studentRepository.save(student);

    if (firstName || lastName || phone || address || username !== undefined || password !== undefined || parentsName !== undefined || parentPhone !== undefined) {
      const profile = await this.profileRepository.findOne({ where: { student: { id } } });
      if (profile) {
        Object.assign(profile, {
          firstName: firstName || profile.firstName,
          lastName: lastName || profile.lastName,
          phone: phone || profile.phone,
          address: address || profile.address,
          username: username !== undefined ? username : profile.username,
          password: password ? await bcrypt.hash(password, 10) : (updateStudentDto.password === null ? null : profile.password),
          parentsName: parentsName !== undefined ? parentsName : profile.parentsName,
          parentPhone: parentPhone !== undefined ? parentPhone : profile.parentPhone,
        });
        await this.profileRepository.save(profile);
      }
    }

    return updatedStudent;
  }

  async deleteStudent(id: number): Promise<void> {
    const student = await this.getStudentById(id);
    await this.studentRepository.remove(student);
  }

  async getAttendanceRanking(): Promise<any[]> {
    const students = await this.studentRepository.find({
      relations: ['attendances', 'attendances.lesson', 'groups'],
    });

    return students
      .map(student => {
        const presentCount = student.attendances.filter(att => att.status === 'present').length;
        const totalCount = student.attendances.length;
        return {
          student,
          presentCount,
          totalCount,
          attendanceRate: totalCount > 0 ? (presentCount / totalCount) * 100 : 0,
        };
      })
      .sort((a, b) => b.presentCount - a.presentCount);
  }
}