import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Profile } from './entities/profile.entity';
import { CreateProfileDto } from './dto/create.profile.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { Student } from '../students/entities/student.entity';
import { Admin } from '../admin/entities/admin.entity';
import { Teacher } from '../teacher/entities/teacher.entity';
import { SuperAdmin } from '../super-admin/entities/super-admin.entity';
import * as bcrypt from 'bcrypt';

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

  async getMyProfile(userId: number): Promise<Profile> {
    const profile = await this.profileRepository.findOne({
      where: [
        { student: { id: userId } },
        { admin: { id: userId } },
        { teacher: { id: userId } },
        { SuperAdmin: { id: userId } },
      ],
      relations: ['student', 'admin', 'teacher', 'SuperAdmin'],
    });

    if (!profile) {
      throw new NotFoundException(`Profile with user ID ${userId} not found`);
    }

    return profile;
  }

  async updateMyProfile(userId: number, updateProfileDto: UpdateProfileDto): Promise<Profile> {
    const profile = await this.getMyProfile(userId);

    const { studentId, adminId, teacherId, superAdminId, ...rest } = updateProfileDto;

    // Username yoki phone uchun unikalikni tekshirish
    if (rest.username && rest.username !== profile.username) {
      const existingProfile = await this.profileRepository.findOne({
        where: [
          { student: { username: rest.username } },
          { admin: { username: rest.username } },
          { teacher: { username: rest.username } },
          { SuperAdmin: { username: rest.username } },
        ],
      });
      if (existingProfile && existingProfile.id !== profile.id) {
        throw new ConflictException(`Username ${rest.username} already exists`);
      }
    }

    if (rest.phone && rest.phone !== profile.phone) {
      const existingProfile = await this.profileRepository.findOne({
        where: [
          { student: { phone: rest.phone } },
          { admin: { phone: rest.phone } },
          { teacher: { phone: rest.phone } },
          { SuperAdmin: { phone: rest.phone } },
        ],
      });
      if (existingProfile && existingProfile.id !== profile.id) {
        throw new ConflictException(`Phone ${rest.phone} already exists`);
      }
    }

    // Parolni hash qilish
    let hashedPassword: string | undefined;
    if (rest.password) {
      hashedPassword = await bcrypt.hash(rest.password, 10);
    }

    // Profil maydonlarini yangilash
    if (rest.firstName !== undefined) profile.firstName = rest.firstName;
    if (rest.lastName !== undefined) profile.lastName = rest.lastName;
    if (rest.photo !== undefined) profile.photo = rest.photo;
    if (rest.username !== undefined) profile.username = rest.username;
    if (hashedPassword !== undefined) profile.password = hashedPassword;
    if (rest.address !== undefined) profile.address = rest.address;
    if (rest.phone !== undefined) profile.phone = rest.phone;
    if (rest.parentsName !== undefined) profile.parentsName = rest.parentsName;
    if (rest.parentPhone !== undefined) profile.parentPhone = rest.parentPhone;

    // Bog'langan foydalanuvchi jadvalini yangilash
    if (profile.student) {
      const student = await this.studentRepository.findOne({ where: { id: profile.student.id } });
      if (student) {
        if (rest.firstName !== undefined) student.firstName = rest.firstName;
        if (rest.lastName !== undefined) student.lastName = rest.lastName;
        if (rest.phone !== undefined) student.phone = rest.phone;
        if (rest.address !== undefined) student.address = rest.address;
        if (rest.username !== undefined) student.username = rest.username;
        if (hashedPassword !== undefined) student.password = hashedPassword;
        if (rest.parentsName !== undefined) student.parentsName = rest.parentsName;
        if (rest.parentPhone !== undefined) student.parentPhone = rest.parentPhone;
        await this.studentRepository.save(student);
      }
    }

    if (profile.admin) {
      const admin = await this.adminRepository.findOne({ where: { id: profile.admin.id } });
      if (admin) {
        if (rest.firstName !== undefined) admin.firstName = rest.firstName;
        if (rest.lastName !== undefined) admin.lastName = rest.lastName;
        if (rest.phone !== undefined) admin.phone = rest.phone;
        if (rest.address !== undefined) admin.address = rest.address;
        if (rest.username !== undefined) admin.username = rest.username;
        if (hashedPassword !== undefined) admin.password = hashedPassword;
        await this.adminRepository.save(admin);
      }
    }

    if (profile.teacher) {
      const teacher = await this.teacherRepository.findOne({ where: { id: profile.teacher.id } });
      if (teacher) {
        if (rest.firstName !== undefined) teacher.firstName = rest.firstName;
        if (rest.lastName !== undefined) teacher.lastName = rest.lastName;
        if (rest.phone !== undefined) teacher.phone = rest.phone;
        if (rest.address !== undefined) teacher.address = rest.address;
        if (rest.username !== undefined) teacher.username = rest.username;
        if (hashedPassword !== undefined) teacher.password = hashedPassword;
        await this.teacherRepository.save(teacher);
      }
    }

    if (profile.SuperAdmin) {
      const superAdmin = await this.superAdminRepository.findOne({ where: { id: profile.SuperAdmin.id } });
      if (superAdmin) {
        if (rest.firstName !== undefined) superAdmin.firstName = rest.firstName;
        if (rest.lastName !== undefined) superAdmin.lastName = rest.lastName;
        if (rest.phone !== undefined) superAdmin.phone = rest.phone;
        if (rest.address !== undefined) superAdmin.address = rest.address;
        if (rest.username !== undefined) superAdmin.username = rest.username;
        if (hashedPassword !== undefined) superAdmin.password = hashedPassword;
        await this.superAdminRepository.save(superAdmin);
      }
    }

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