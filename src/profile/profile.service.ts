import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
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

    if (username) {
      const existingProfile = await this.profileRepository.findOne({
        where: [
          { student: { username } },
          { admin: { username } },
          { teacher: { username } },
          { SuperAdmin: { username } },
        ],
      });
      if (existingProfile) {
        throw new ConflictException(`Username ${username} already exists`);
      }
    }

    if (phone) {
      const existingProfile = await this.profileRepository.findOne({
        where: [
          { student: { phone } },
          { admin: { phone } },
          { teacher: { phone } },
          { SuperAdmin: { phone } },
        ],
      });
      if (existingProfile) {
        throw new ConflictException(`Phone ${phone} already exists`);
      }
    }

    const profileData: Partial<Profile> = {
      firstName,
      lastName,
      photo,
      username: username || null,
      password: password ? await bcrypt.hash(password, 10) : null,
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
    return this.profileRepository.find({ relations: ['student', 'admin', 'teacher', 'SuperAdmin'] });
  }

  async getProfileById(id: number): Promise<Profile> {
    const profile = await this.profileRepository.findOne({ 
      where: { id }, 
      relations: ['student', 'admin', 'teacher', 'SuperAdmin'] 
    });
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

    // Username unikalik tekshiruvi
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

    // Phone unikalik tekshiruvi
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
    Object.assign(profile, {
      firstName: rest.firstName ?? profile.firstName,
      lastName: rest.lastName ?? profile.lastName,
      photo: rest.photo ?? profile.photo,
      username: rest.username ?? profile.username,
      password: hashedPassword ?? profile.password,
      address: rest.address ?? profile.address,
      phone: rest.phone ?? profile.phone,
      parentsName: rest.parentsName ?? profile.parentsName,
      parentPhone: rest.parentPhone ?? profile.parentPhone,
    });

    // Bog'langan foydalanuvchi jadvalini yangilash
    if (profile.student) {
      const student = await this.studentRepository.findOne({ where: { id: profile.student.id } });
      if (student) {
        Object.assign(student, {
          firstName: rest.firstName ?? student.firstName,
          lastName: rest.lastName ?? student.lastName,
          phone: rest.phone ?? student.phone,
          address: rest.address ?? student.address,
          username: rest.username ?? student.username,
          password: hashedPassword ?? student.password,
          parentsName: rest.parentsName ?? student.parentsName,
          parentPhone: rest.parentPhone ?? student.parentPhone,
        });
        await this.studentRepository.save(student);
      }
    }

    if (profile.admin) {
      const admin = await this.adminRepository.findOne({ where: { id: profile.admin.id } });
      if (admin) {
        Object.assign(admin, {
          firstName: rest.firstName ?? admin.firstName,
          lastName: rest.lastName ?? admin.lastName,
          phone: rest.phone ?? admin.phone,
          address: rest.address ?? admin.address,
          username: rest.username ?? admin.username,
          password: hashedPassword ?? admin.password,
        });
        await this.adminRepository.save(admin);
      }
    }

    if (profile.teacher) {
      const teacher = await this.teacherRepository.findOne({ where: { id: profile.teacher.id } });
      if (teacher) {
        Object.assign(teacher, {
          firstName: rest.firstName ?? teacher.firstName,
          lastName: rest.lastName ?? teacher.lastName,
          phone: rest.phone ?? teacher.phone,
          address: rest.address ?? teacher.address,
          username: rest.username ?? teacher.username,
          password: hashedPassword ?? teacher.password,
        });
        await this.teacherRepository.save(teacher);
      }
    }

    if (profile.SuperAdmin) {
      const superAdmin = await this.superAdminRepository.findOne({ where: { id: profile.SuperAdmin.id } });
      if (superAdmin) {
        Object.assign(superAdmin, {
          firstName: rest.firstName ?? superAdmin.firstName,
          lastName: rest.lastName ?? superAdmin.lastName,
          phone: rest.phone ?? superAdmin.phone,
          address: rest.address ?? superAdmin.address,
          username: rest.username ?? superAdmin.username,
          password: hashedPassword ?? superAdmin.password,
        });
        await this.superAdminRepository.save(superAdmin);
      }
    }

    // Aloqalarni faqat kiritilgan bo'lsa yangilash
    if (studentId !== undefined) {
      profile.student = studentId === null ? null : await this.studentRepository.findOne({ where: { id: studentId } }) || profile.student;
      if (studentId !== null && !profile.student) {
        throw new NotFoundException(`Student with ID ${studentId} not found`);
      }
    }

    if (adminId !== undefined) {
      profile.admin = adminId === null ? null : await this.adminRepository.findOne({ where: { id: adminId } }) || profile.admin;
      if (adminId !== null && !profile.admin) {
        throw new NotFoundException(`Admin with ID ${adminId} not found`);
      }
    }

    if (teacherId !== undefined) {
      profile.teacher = teacherId === null ? null : await this.teacherRepository.findOne({ where: { id: teacherId } }) || profile.teacher;
      if (teacherId !== null && !profile.teacher) {
        throw new NotFoundException(`Teacher with ID ${teacherId} not found`);
      }
    }

    if (superAdminId !== undefined) {
      profile.SuperAdmin = superAdminId === null ? null : await this.superAdminRepository.findOne({ where: { id: superAdminId } }) || profile.SuperAdmin;
      if (superAdminId !== null && !profile.SuperAdmin) {
        throw new NotFoundException(`SuperAdmin with ID ${superAdminId} not found`);
      }
    }

    return this.profileRepository.save(profile);
  }

  async deleteProfile(id: number): Promise<void> {
    const profile = await this.getProfileById(id);
    await this.profileRepository.remove(profile);
  }
}