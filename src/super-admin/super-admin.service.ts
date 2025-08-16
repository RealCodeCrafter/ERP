import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike, Between } from 'typeorm';
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
    // 🔹 Jami o‘quvchilar
    const totalStudents = await this.studentRepository.count();

    // 🔹 Guruhlar soni
    const totalGroups = await this.groupRepository.count();

    // 🔹 Faol va bitirgan o‘quvchilar
    const activeStudents = await this.studentRepository
      .createQueryBuilder('student')
      .innerJoin('student.groups', 'group')
      .where('group.status = :status', { status: 'active' })
      .distinct(true)
      .getCount();

    const completedStudents = await this.studentRepository
      .createQueryBuilder('student')
      .innerJoin('student.groups', 'group')
      .where('group.status = :status', { status: 'completed' })
      .distinct(true)
      .getCount();

    // 🔹 Oylik daromad (active guruhlar bo'yicha kutilgan daromad)
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const activeGroups = await this.groupRepository.find({
      where: { status: 'active' },
      relations: ['students'],
    });

    const monthlyRevenue = activeGroups.reduce((sum, group) => {
      return sum + group.students.length * group.price;
    }, 0);

    // 🔹 To'lov qilganlar (joriy oyda paid: true bo'lganlar soni)
    const paidStudents = await this.paymentRepository
      .createQueryBuilder('payment')
      .select('COUNT(DISTINCT payment.studentId)', 'count')
      .where('payment.paid = :paid', { paid: true })
      .andWhere('payment.createdAt BETWEEN :start AND :end', {
        start: startOfMonth,
        end: endOfMonth,
      })
      .getRawOne();

    // 🔹 To'lov qilmaganlar (active guruhlardagi studentlar orasida)
    const activeStudentsList = await this.studentRepository
      .createQueryBuilder('student')
      .innerJoin('student.groups', 'group')
      .where('group.status = :status', { status: 'active' })
      .distinct(true)
      .getMany();

    const paidStudentIds = await this.paymentRepository
      .createQueryBuilder('payment')
      .select('DISTINCT payment.studentId')
      .where('payment.paid = :paid', { paid: true })
      .andWhere('payment.createdAt BETWEEN :start AND :end', {
        start: startOfMonth,
        end: endOfMonth,
      })
      .getRawMany();

    const paidStudentIdsSet = new Set(paidStudentIds.map(p => p.studentId));
    const unpaidStudents = activeStudentsList.filter(student => !paidStudentIdsSet.has(student.id)).length;

    // 🔹 Oylik daromadlar (joriy yil uchun hozirgi oygacha va joriy oy uchun kutilgan)
    const monthlyIncomes = [];
    const currentMonth = now.getMonth(); // 0-based (0 = Yanvar, 7 = Avgust)

    for (let month = 0; month <= currentMonth; month++) {
      const monthStart = new Date(now.getFullYear(), month, 1);
      const monthEnd = new Date(now.getFullYear(), month + 1, 0);

      let income = 0;
      if (month === currentMonth) {
        // Joriy oy uchun kutilgan daromad (active guruhlar bo'yicha)
        const activeGroupsInMonth = await this.groupRepository.find({
          where: { status: 'active' },
          relations: ['students'],
        });
        income = activeGroupsInMonth.reduce((sum, group) => {
          return sum + group.students.length * group.price;
        }, 0);
      } else {
        // O'tgan oylar uchun haqiqiy to'lovlar
        const payments = await this.paymentRepository.find({
          where: {
            paid: true,
            createdAt: Between(monthStart, monthEnd),
          },
        });
        income = payments.reduce((sum, payment) => sum + payment.amount, 0);
      }

      monthlyIncomes.push({
        month: month + 1,
        income,
      });
    }

    return {
      jami: totalStudents,
      faolOquvchilar: activeStudents,
      bitirganOquvchilar: completedStudents,
      guruhlar: totalGroups,
      oylikDaromad: monthlyRevenue,
      tolovQilganlar: Number(paidStudents.count),
      tolovQilmaganlar: unpaidStudents,
      oylikDaromadlar: monthlyIncomes.map((mi, index) => ({
        month: [
          'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
          'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
        ][index],
        income: mi.income,
      })),
    };
  }
}