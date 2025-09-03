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

  async updateMyProfile(
  userId: number,
  updateProfileDto: UpdateProfileDto,
): Promise<Profile> {
  const profile = await this.getMyProfile(userId);

  if (!profile) {
    throw new NotFoundException(`Profile not found for userId ${userId}`);
  }

  const { studentId, adminId, teacherId, superAdminId, ...rest } = updateProfileDto;

  // Username unikalik tekshiruvi
  if (rest.username && rest.username !== profile.username) {
    const existing = await this.profileRepository.findOne({
      where: { username: rest.username },
    });
    if (existing && existing.id !== profile.id) {
      throw new ConflictException(`Username ${rest.username} already exists`);
    }
  }

  // Phone unikalik tekshiruvi
  if (rest.phone && rest.phone !== profile.phone) {
    const existing = await this.profileRepository.findOne({
      where: { phone: rest.phone },
    });
    if (existing && existing.id !== profile.id) {
      throw new ConflictException(`Phone ${rest.phone} already exists`);
    }
  }

  // Parolni hash qilish
  let hashedPassword: string | undefined;
  if (rest.password) {
    hashedPassword = await bcrypt.hash(rest.password, 10);
  }

  // Profilni yangilash
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

  // Student update
  if (profile.student) {
    Object.assign(profile.student, {
      firstName: rest.firstName ?? profile.student.firstName,
      lastName: rest.lastName ?? profile.student.lastName,
      username: rest.username ?? profile.student.username,
      password: hashedPassword ?? profile.student.password,
      phone: rest.phone ?? profile.student.phone,
      address: rest.address ?? profile.student.address,
      parentsName: rest.parentsName ?? profile.student.parentsName,
      parentPhone: rest.parentPhone ?? profile.student.parentPhone,
    });
    await this.studentRepository.save(profile.student);
  }

  // Admin update
  if (profile.admin) {
    Object.assign(profile.admin, {
      firstName: rest.firstName ?? profile.admin.firstName,
      lastName: rest.lastName ?? profile.admin.lastName,
      username: rest.username ?? profile.admin.username,
      password: hashedPassword ?? profile.admin.password,
      phone: rest.phone ?? profile.admin.phone,
      address: rest.address ?? profile.admin.address,
    });
    await this.adminRepository.save(profile.admin);
  }

  // Teacher update
  if (profile.teacher) {
    Object.assign(profile.teacher, {
      firstName: rest.firstName ?? profile.teacher.firstName,
      lastName: rest.lastName ?? profile.teacher.lastName,
      username: rest.username ?? profile.teacher.username,
      password: hashedPassword ?? profile.teacher.password,
      phone: rest.phone ?? profile.teacher.phone,
      address: rest.address ?? profile.teacher.address,
    });
    await this.teacherRepository.save(profile.teacher);
  }

  // SuperAdmin update
  if (profile.SuperAdmin) {
    Object.assign(profile.SuperAdmin, {
      firstName: rest.firstName ?? profile.SuperAdmin.firstName,
      lastName: rest.lastName ?? profile.SuperAdmin.lastName,
      username: rest.username ?? profile.SuperAdmin.username,
      password: hashedPassword ?? profile.SuperAdmin.password,
      phone: rest.phone ?? profile.SuperAdmin.phone,
      address: rest.address ?? profile.SuperAdmin.address,
    });
    await this.superAdminRepository.save(profile.SuperAdmin);
  }

  // Aloqalarni yangilash (faqat ID berilsa)
  if (studentId) {
    const student = await this.studentRepository.findOne({ where: { id: studentId } });
    if (!student) throw new NotFoundException(`Student with ID ${studentId} not found`);
    profile.student = student;
  }

  if (adminId) {
    const admin = await this.adminRepository.findOne({ where: { id: adminId } });
    if (!admin) throw new NotFoundException(`Admin with ID ${adminId} not found`);
    profile.admin = admin;
  }

  if (teacherId) {
    const teacher = await this.teacherRepository.findOne({ where: { id: teacherId } });
    if (!teacher) throw new NotFoundException(`Teacher with ID ${teacherId} not found`);
    profile.teacher = teacher;
  }

  if (superAdminId) {
    const superAdmin = await this.superAdminRepository.findOne({ where: { id: superAdminId } });
    if (!superAdmin) throw new NotFoundException(`SuperAdmin with ID ${superAdminId} not found`);
    profile.SuperAdmin = superAdmin;
  }

  return this.profileRepository.save(profile);
}


  async deleteProfile(id: number): Promise<void> {
    const profile = await this.getProfileById(id);
    await this.profileRepository.remove(profile);
  }
}