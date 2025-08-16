import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';

import { Admin } from '../admin/entities/admin.entity';
import { Teacher } from '../teacher/entities/teacher.entity';
import { Student } from '../students/entities/student.entity';
import { SuperAdmin } from '../super-admin/entities/super-admin.entity';

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

    // Username bo‘yicha barcha rolda qidiramiz
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

    // Parolni tekshirish
    if (!user.password) {
      throw new UnauthorizedException('User has no password set');
    }

    const isPasswordValid = await bcrypt.compare(loginDto.password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Parol noto‘g‘ri');
    }

    // JWT token yaratish
    const payload = { id: user.id, username: user.username, role: user.role };
    const accessToken = this.jwtService.sign(payload, {
      secret: process.env.JWT_SECRET,
    });

    return { accessToken, user };
  }

  async logout(userId: number) {
    return { message: `User ${userId} logged out successfully` };
  }
}
