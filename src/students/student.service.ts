import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';
import { Student } from './entities/student.entity';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import { Group } from '../groups/entities/group.entity';
import { Profile } from 'src/profile/entities/profile.entity';
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
  ) {}

  async getAllStudents(): Promise<Student[]> {
    const students = await this.studentRepository.find({
      relations: ['groups', 'groups.course', 'profile'],
    });
    if (students.length === 0) {
      throw new NotFoundException('Hech qanday talaba topilmadi');
    }
    return students;
  }

  async getStudentById(id: number): Promise<Student> {
    const student = await this.studentRepository.findOne({
      where: { id },
      relations: ['groups', 'groups.course', 'profile'],
    });
    if (!student) {
      throw new NotFoundException(`ID ${id} bo‘yicha talaba topilmadi`);
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
      relations: ['groups', 'groups.course', 'profile'],
    });

    if (students.length === 0) {
      throw new NotFoundException(`"${name}" bo‘yicha talaba topilmadi`);
    }
    return students;
  }

  async createStudent(createStudentDto: CreateStudentDto): Promise<Student> {
    const { phone, username, password, groupId, firstName, lastName, address, parentsName, parentPhone } = createStudentDto;

    const existingStudent = await this.studentRepository.findOne({ where: { phone } });
    if (existingStudent) {
      throw new NotFoundException(`Ushbu telefon raqami bilan talaba avval qo‘shilgan: ${phone}`);
    }

    if (username) {
      const existingUsername = await this.studentRepository.findOne({ where: { username } });
      if (existingUsername) {
        throw new NotFoundException(`Ushbu foydalanuvchi nomi mavjud: ${username}`);
      }
    }

    const hashedPassword = password ? await bcrypt.hash(password, 10) : null;

    const group = await this.groupRepository.findOne({ where: { id: groupId }, relations: ['course'] });
    if (!group) {
      throw new NotFoundException(`ID ${groupId} bo‘yicha guruh topilmadi`);
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
        throw new NotFoundException(`ID ${groupId} bo‘yicha guruh topilmadi`);
      }
      student.groups = [group];
    }

    if (username) {
      const existingUsername = await this.studentRepository.findOne({ where: { username } });
      if (existingUsername && existingUsername.id !== id) {
        throw new NotFoundException(`Ushbu foydalanuvchi nomi mavjud: ${username}`);
      }
    }

    if (phone) {
      const existingStudent = await this.studentRepository.findOne({ where: { phone } });
      if (existingStudent && existingStudent.id !== id) {
        throw new NotFoundException(`Ushbu telefon raqami bilan talaba avval qo‘shilgan: ${phone}`);
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
}