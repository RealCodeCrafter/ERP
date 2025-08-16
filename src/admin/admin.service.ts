import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike, Between } from 'typeorm';
import { Admin } from './entities/admin.entity';
import { CreateAdminDto } from './dto/create-admin.dto';
import { UpdateAdminDto } from './dto/update-admin.dto';
import { Profile } from '../profile/entities/profile.entity';
import { Student } from '../students/entities/student.entity';
import { Group } from '../groups/entities/group.entity';
import { Course } from '../courses/entities/course.entity';
import { Payment } from '../payment/entities/payment.entity';
import { Attendance } from '../attendance/entities/attendance.entity';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(Admin)
    private adminRepository: Repository<Admin>,
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

  async getAll(): Promise<Admin[]> {
    const admins = await this.adminRepository.find({ relations: ['profile'] });
    if (admins.length === 0) {
      throw new NotFoundException('No admins found');
    }
    return admins;
  }
async create(createAdminDto: CreateAdminDto): Promise<Admin> {
  const existingAdmin = await this.adminRepository.findOne({
    where: { username: createAdminDto.username },
  });
  if (existingAdmin) {
    throw new ConflictException(`Username ${createAdminDto.username} already exists`);
  }

  const existingPhone = await this.adminRepository.findOne({
    where: { phone: createAdminDto.phone },
  });
  if (existingPhone) {
    throw new ConflictException(`Phone ${createAdminDto.phone} already exists`);
  }

  const hashedPassword = await bcrypt.hash(createAdminDto.password, 10);

  const profile = this.profileRepository.create({
    username: createAdminDto.username,
    password: hashedPassword,
    firstName: createAdminDto.firstName,
    lastName: createAdminDto.lastName,
    phone: createAdminDto.phone,
    address: createAdminDto.address,
  });

  await this.profileRepository.save(profile);

  const admin = this.adminRepository.create({
    username: createAdminDto.username,
    password: hashedPassword,
    firstName: createAdminDto.firstName,
    lastName: createAdminDto.lastName,
    phone: createAdminDto.phone,
    address: createAdminDto.address,
    role: 'admin',
    profile,
  });

  return this.adminRepository.save(admin);
}


  async update(id: number, updateAdminDto: UpdateAdminDto): Promise<Admin> {
    const admin = await this.adminRepository.findOne({
      where: { id },
      relations: ['profile'],
    });

    if (!admin) {
      throw new NotFoundException(`Admin with ID ${id} not found`);
    }

    if (updateAdminDto.username && updateAdminDto.username !== admin.username) {
      const existingUsername = await this.adminRepository.findOne({
        where: { username: updateAdminDto.username },
      });
      if (existingUsername && existingUsername.id !== id) {
        throw new ConflictException(`Username ${updateAdminDto.username} already exists`);
      }
    }

    if (updateAdminDto.phone && updateAdminDto.phone !== admin.phone) {
      const existingPhone = await this.adminRepository.findOne({
        where: { phone: updateAdminDto.phone },
      });
      if (existingPhone && existingPhone.id !== id) {
        throw new ConflictException(`Phone ${updateAdminDto.phone} already exists`);
      }
    }

    if (updateAdminDto.password) {
      updateAdminDto.password = await bcrypt.hash(updateAdminDto.password, 10);
    }

    Object.assign(admin, {
      username: updateAdminDto.username || admin.username,
      password: updateAdminDto.password || admin.password,
      firstName: updateAdminDto.firstName || admin.firstName,
      lastName: updateAdminDto.lastName || admin.lastName,
      phone: updateAdminDto.phone || admin.phone,
      address: updateAdminDto.address || admin.address,
    });

    const updatedAdmin = await this.adminRepository.save(admin);

    if (admin.profile) {
      Object.assign(admin.profile, {
        username: updateAdminDto.username || admin.profile.username,
        password: updateAdminDto.password || admin.profile.password,
        firstName: updateAdminDto.firstName || admin.profile.firstName,
        lastName: updateAdminDto.lastName || admin.profile.lastName,
        phone: updateAdminDto.phone || admin.profile.phone,
        address: updateAdminDto.address || admin.profile.address,
      });
      await this.profileRepository.save(admin.profile);
    }

    return updatedAdmin;
  }

  async delete(id: number): Promise<void> {
    const admin = await this.adminRepository.findOne({ where: { id } });
    if (!admin) {
      throw new NotFoundException(`Admin with ID ${id} not found`);
    }
    await this.adminRepository.remove(admin);
  }

  async searchAdmins(name: string): Promise<Admin[]> {
    const query: any = {};
    if (name) {
      query.firstName = ILike(`%${name}%`);
    }
    const admins = await this.adminRepository.find({
      where: query,
      relations: ['profile'],
    });
    if (admins.length === 0) {
      throw new NotFoundException(`No admins found for name "${name}"`);
    }
    return admins;
  }

   async getStatistics(): Promise<any> {
    const totalStudents = await this.studentRepository.count();

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

    const paidStudents = await this.paymentRepository
      .createQueryBuilder('payment')
      .select('COUNT(DISTINCT payment.studentId)', 'count')
      .where('payment.paid = :paid', { paid: true })
      .andWhere('payment.createdAt BETWEEN :start AND :end', {
        start: startOfMonth,
        end: endOfMonth,
      })
      .getRawOne();
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
    const monthlyIncomes = [];
    const currentMonth = now.getMonth();

    for (let month = 0; month <= currentMonth; month++) {
      const monthStart = new Date(now.getFullYear(), month, 1);
      const monthEnd = new Date(now.getFullYear(), month + 1, 0);

      let income = 0;
      if (month === currentMonth) {
        const activeGroupsInMonth = await this.groupRepository.find({
          where: { status: 'active' },
          relations: ['students'],
        });
        income = activeGroupsInMonth.reduce((sum, group) => {
          return sum + group.students.length * group.price;
        }, 0);
      } else {
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