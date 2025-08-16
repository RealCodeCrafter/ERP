import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { InjectRepository } from '@nestjs/typeorm';
import { Admin } from '../admin/entities/admin.entity';
import { Teacher } from '../teacher/entities/teacher.entity';
import { Student } from '../students/entities/student.entity';
import { Repository } from 'typeorm';
import { SuperAdmin } from 'src/super-admin/entities/super-admin.entity';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(Admin) private readonly adminRepository: Repository<Admin>,
    @InjectRepository(Teacher) private readonly teacherRepository: Repository<Teacher>,
    @InjectRepository(Student) private readonly studentRepository: Repository<Student>,
    @InjectRepository(SuperAdmin) private readonly superAdminRepository: Repository<SuperAdmin>,
    private readonly jwtService: JwtService,
  ) {}

  async login(loginDto: { username: string; password: string }) {
    let user: any;

    // Foydalanuvchini qidirish
    user = await this.adminRepository.findOne({ where: { username: loginDto.username } });
    if (!user) {
      user = await this.teacherRepository.findOne({ where: { username: loginDto.username } });
    }
    if (!user) {
      user = await this.studentRepository.findOne({ where: { username: loginDto.username } });
    }
    if (!user) {
      user = await this.superAdminRepository.findOne({ where: { username: loginDto.username } });
    }

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Parolni tekshirish (agar password saqlanayotgan bo‘lsa)
    if (user.password && !(await bcrypt.compare(loginDto.password, user.password))) {
      throw new UnauthorizedException('Parol noto‘g‘ri');
    }

    // JWT token yaratish (expiresIn bermaymiz → doimiy token)
    const payload = { id: user.id, username: user.username, role: user.role };
    const accessToken = this.jwtService.sign(payload, {
      secret: process.env.JWT_SECRET,
    });

    return { accessToken, user };
  }

  async logout(userId: number) {
    // logout faqat xabar qaytaradi
    return { message: `User ${userId} logged out successfully` };
  }
}
