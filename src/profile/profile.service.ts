import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Profile } from './entities/profile.entity';
import { CreateProfileDto } from './dto/create.profile.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { Student } from '../students/entities/student.entity';
import { Admin } from '../admin/entities/admin.entity';
import { Teacher } from '../teacher/entities/teacher.entity';
import { SuperAdmin } from '../super-admin/entities/super-admin.entity';

@Injectable()
export class ProfilesService {
  constructor(
    @InjectRepository(Profile)
    private readonly profileRepository: Repository<Profile>,
    @InjectRepository(Student)
    private readonly studentRepository: Repository<Student>,
    @InjectRepository(Admin)
    private readonly adminRepository: Repository<Admin>,
    @InjectRepository(Teacher)
    private readonly teacherRepository: Repository<Teacher>,
    @InjectRepository(SuperAdmin)
    private readonly superAdminRepository: Repository<SuperAdmin>,
  ) {}

  async createProfile(createProfileDto: CreateProfileDto): Promise<Profile> {
    const { studentId, adminId, teacherId, firstName, lastName, photo, username, password, address, phone, parentsName, parentPhone } = createProfileDto;

    const profileData: Partial<Profile> = {
      firstName,
      lastName,
      photo,
      username: username || null,
      password: password,
      address,
      phone,
      parentsName,
      parentPhone,
    };

    if (studentId) {
      const student = await this.studentRepository.findOne({ where: { id: studentId } });
      if (!student) {
        throw new NotFoundException(`Student with ID ${studentId} not found`);
      }
      profileData.student = student;
    }

    if (adminId) {
      const admin = await this.adminRepository.findOne({ where: { id: adminId } });
      if (!admin) {
        throw new NotFoundException(`Admin with ID ${adminId} not found`);
      }
      profileData.admin = admin;
    }

    if (teacherId) {
      const teacher = await this.teacherRepository.findOne({ where: { id: teacherId } });
      if (!teacher) {
        throw new NotFoundException(`Teacher with ID ${teacherId} not found`);
      }
      profileData.teacher = teacher;
    }

    const profile = this.profileRepository.create(profileData);
    return this.profileRepository.save(profile);
  }

  async getAllProfiles(): Promise<Profile[]> {
    return this.profileRepository.find({ relations: ['student', 'admin', 'teacher'] });
  }

  async getProfileById(id: number): Promise<Profile> {
    const profile = await this.profileRepository.findOne({ where: { id }, relations: ['student', 'admin', 'teacher'] });
    if (!profile) {
      throw new NotFoundException(`Profile with ID ${id} not found`);
    }
    return profile;
  }

  async getMyProfile(username: string): Promise<Profile> {
    const profile = await this.profileRepository.findOne({
      where: [
        { student: { username } },
        { admin: { username } },
        { teacher: { username } },
        { SuperAdmin: { username } },
      ],
      relations: ['student', 'admin', 'teacher', 'SuperAdmin'],
    });

    if (!profile) {
      throw new NotFoundException(`Profile with username ${username} not found`);
    }

    return profile;
  }

  async updateMyProfile(username: string, updateProfileDto: UpdateProfileDto): Promise<Profile> {
    const profile = await this.getMyProfile(username);

    const { studentId, adminId, teacherId, superAdminId, ...rest } = updateProfileDto;

    // Faqat kiritilgan maydonlarni yangilash
    if (rest.firstName !== undefined) profile.firstName = rest.firstName;
    if (rest.lastName !== undefined) profile.lastName = rest.lastName;
    if (rest.photo !== undefined) profile.photo = rest.photo;
    if (rest.username !== undefined) profile.username = rest.username;
    if (rest.password !== undefined) profile.password = rest.password;
    if (rest.address !== undefined) profile.address = rest.address;
    if (rest.phone !== undefined) profile.phone = rest.phone;
    if (rest.parentsName !== undefined) profile.parentsName = rest.parentsName;
    if (rest.parentPhone !== undefined) profile.parentPhone = rest.parentPhone;

    // Aloqalarni faqat kiritilgan bo'lsa yangilash
    if (studentId !== undefined) {
      if (studentId === null) {
        profile.student = null;
      } else {
        const student = await this.studentRepository.findOne({ where: { id: studentId } });
        if (!student) {
          throw new NotFoundException(`Student with ID ${studentId} not found`);
        }
        profile.student = student;
      }
    }

    if (adminId !== undefined) {
      if (adminId === null) {
        profile.admin = null;
      } else {
        const admin = await this.adminRepository.findOne({ where: { id: adminId } });
        if (!admin) {
          throw new NotFoundException(`Admin with ID ${adminId} not found`);
        }
        profile.admin = admin;
      }
    }

    if (teacherId !== undefined) {
      if (teacherId === null) {
        profile.teacher = null;
      } else {
        const teacher = await this.teacherRepository.findOne({ where: { id: teacherId } });
        if (!teacher) {
          throw new NotFoundException(`Teacher with ID ${teacherId} not found`);
        }
        profile.teacher = teacher;
      }
    }

    if (superAdminId !== undefined) {
      if (superAdminId === null) {
        profile.SuperAdmin = null;
      } else {
        const superAdmin = await this.superAdminRepository.findOne({ where: { id: superAdminId } });
        if (!superAdmin) {
          throw new NotFoundException(`SuperAdmin with ID ${superAdminId} not found`);
        }
        profile.SuperAdmin = superAdmin;
      }
    }

    return this.profileRepository.save(profile);
  }

  async deleteProfile(id: number): Promise<void> {
    const profile = await this.getProfileById(id);
    await this.profileRepository.remove(profile);
  }
}