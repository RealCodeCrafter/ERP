import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import { SuperAdmin } from './entities/super-admin.entity';
import { CreateSuperAdminDto } from './dto/create-super-admin.dto';
import { UpdateSuperAdminDto } from './dto/update-super-admin.dto';
import { Profile } from '../profile/entities/profile.entity';
import { Student } from '../students/entities/student.entity';
import { Group } from '../groups/entities/group.entity';
import { Course } from '../courses/entities/course.entity';
import { Payment } from '../payment/entities/payment.entity';
import { Attendance } from '../attendance/entities/attendance.entity';
import * as bcrypt from 'bcrypt';

@Injectable()
export class SuperAdminService {
  constructor(
    @InjectRepository(SuperAdmin)
    private superAdminRepository: Repository<SuperAdmin>,
    @InjectRepository(Profile)
    private profileRepository: Repository<Profile>,
    @InjectRepository(Student)
    private studentRepository: Repository<Student>,
    @InjectRepository(Group)
    private groupRepository: Repository<Group>,
    @InjectRepository(Course)
    private courseRepository: Repository<Course>,
    @InjectRepository(Payment)
    private paymentRepository: Repository<Payment>,
    @InjectRepository(Attendance)
    private attendanceRepository: Repository<Attendance>,
  ) {}

  async getAll(): Promise<SuperAdmin[]> {
    const superAdmins = await this.superAdminRepository.find({ relations: ['profile'] });
    if (superAdmins.length === 0) {
      throw new NotFoundException('No super admins found');
    }
    return superAdmins;
  }

  async create(createSuperAdminDto: CreateSuperAdminDto): Promise<SuperAdmin> {
    const existingSuperAdmin = await this.superAdminRepository.findOne({
      where: { username: createSuperAdminDto.username },
    });

    if (existingSuperAdmin) {
      throw new ConflictException(`Username ${createSuperAdminDto.username} already exists`);
    }

    const existingPhone = await this.superAdminRepository.findOne({
      where: { phone: createSuperAdminDto.phone },
    });

    if (existingPhone) {
      throw new ConflictException(`Phone ${createSuperAdminDto.phone} already exists`);
    }

    const hashedPassword = await bcrypt.hash(createSuperAdminDto.password, 10);

    const profile = this.profileRepository.create({
      username: createSuperAdminDto.username,
      password: hashedPassword,
      firstName: createSuperAdminDto.firstName,
      lastName: createSuperAdminDto.lastName,
      phone: createSuperAdminDto.phone,
      address: createSuperAdminDto.address,
    });

    await this.profileRepository.save(profile);

    const superAdmin = this.superAdminRepository.create({
      username: createSuperAdminDto.username,
      password: hashedPassword,
      firstName: createSuperAdminDto.firstName,
      lastName: createSuperAdminDto.lastName,
      phone: createSuperAdminDto.phone,
      address: createSuperAdminDto.address,
      role: 'superAdmin',
      smsNotificationsEnabled: createSuperAdminDto.smsNotificationsEnabled ?? true,
      profile,
    });

    return this.superAdminRepository.save(superAdmin);
  }

  async update(id: number, updateSuperAdminDto: UpdateSuperAdminDto): Promise<SuperAdmin> {
    const superAdmin = await this.superAdminRepository.findOne({
      where: { id },
      relations: ['profile'],
    });

    if (!superAdmin) {
      throw new NotFoundException(`SuperAdmin with ID ${id} not found`);
    }

    if (updateSuperAdminDto.username && updateSuperAdminDto.username !== superAdmin.username) {
      const existingUsername = await this.superAdminRepository.findOne({
        where: { username: updateSuperAdminDto.username },
      });
      if (existingUsername && existingUsername.id !== id) {
        throw new ConflictException(`Username ${updateSuperAdminDto.username} already exists`);
      }
    }

    if (updateSuperAdminDto.phone && updateSuperAdminDto.phone !== superAdmin.phone) {
      const existingPhone = await this.superAdminRepository.findOne({
        where: { phone: updateSuperAdminDto.phone },
      });
      if (existingPhone && existingPhone.id !== id) {
        throw new ConflictException(`Phone ${updateSuperAdminDto.phone} already exists`);
      }
    }

    if (updateSuperAdminDto.password) {
      updateSuperAdminDto.password = await bcrypt.hash(updateSuperAdminDto.password, 10);
    }

    Object.assign(superAdmin, {
      username: updateSuperAdminDto.username || superAdmin.username,
      password: updateSuperAdminDto.password || superAdmin.password,
      firstName: updateSuperAdminDto.firstName || superAdmin.firstName,
      lastName: updateSuperAdminDto.lastName || superAdmin.lastName,
      phone: updateSuperAdminDto.phone || superAdmin.phone,
      address: updateSuperAdminDto.address || superAdmin.address,
      smsNotificationsEnabled: updateSuperAdminDto.smsNotificationsEnabled ?? superAdmin.smsNotificationsEnabled,
    });

    const updatedSuperAdmin = await this.superAdminRepository.save(superAdmin);

    if (superAdmin.profile) {
      Object.assign(superAdmin.profile, {
        username: updateSuperAdminDto.username || superAdmin.profile.username,
        password: updateSuperAdminDto.password || superAdmin.profile.password,
        firstName: updateSuperAdminDto.firstName || superAdmin.profile.firstName,
        lastName: updateSuperAdminDto.lastName || superAdmin.profile.lastName,
        phone: updateSuperAdminDto.phone || superAdmin.profile.phone,
        address: updateSuperAdminDto.address || superAdmin.profile.address,
      });
      await this.profileRepository.save(superAdmin.profile);
    }

    return updatedSuperAdmin;
  }

  async delete(id: number): Promise<void> {
    const superAdmin = await this.superAdminRepository.findOne({ where: { id } });
    if (!superAdmin) {
      throw new NotFoundException(`SuperAdmin with ID ${id} not found`);
    }
    await this.superAdminRepository.remove(superAdmin);
  }

  async searchSuperAdmins(name: string): Promise<SuperAdmin[]> {
    const query: any = {};
    if (name) {
      query.firstName = ILike(`%${name}%`);
    }
    const superAdmins = await this.superAdminRepository.find({
      where: query,
      relations: ['profile'],
    });
    if (superAdmins.length === 0) {
      throw new NotFoundException(`No super admins found for name "${name}"`);
    }
    return superAdmins;
  }

  async toggleSmsNotifications(id: number, enable: boolean): Promise<SuperAdmin> {
    const superAdmin = await this.superAdminRepository.findOne({ where: { id } });
    if (!superAdmin) {
      throw new NotFoundException(`SuperAdmin with ID ${id} not found`);
    }
    superAdmin.smsNotificationsEnabled = enable;
    return this.superAdminRepository.save(superAdmin);
  }

  async getStatistics(): Promise<any> {
    const studentCount = await this.studentRepository.count();
    const groupCount = await this.groupRepository.count();
    const courseCount = await this.courseRepository.count();
    const totalRevenue = await this.paymentRepository
      .find({ where: { paid: true } })
      .then(payments => payments.reduce((sum, payment) => sum + payment.amount, 0));
    const attendances = await this.attendanceRepository.find();
    const totalAttendances = attendances.length;
    const presentCount = attendances.filter(att => att.status === 'present').length;
    const attendanceRate = totalAttendances > 0 ? (presentCount / totalAttendances) * 100 : 0;

    return {
      studentCount,
      groupCount,
      courseCount,
      totalRevenue,
      attendanceRate: Number(attendanceRate.toFixed(2)),
      presentCount,
      totalAttendances,
    };
  }
}