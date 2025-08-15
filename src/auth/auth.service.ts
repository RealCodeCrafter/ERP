import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Admin } from '../admin/entities/admin.entity';
import { Teacher } from '../teacher/entities/teacher.entity';
import { Student } from '../students/entities/student.entity';
import { SuperAdmin } from '../super-admin/entities/super-admin.entity';
import { LoginDto } from './dto/create-auth.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(Admin) private readonly adminRepository: Repository<Admin>,
    @InjectRepository(Teacher) private readonly teacherRepository: Repository<Teacher>,
    @InjectRepository(Student) private readonly studentRepository: Repository<Student>,
    @InjectRepository(SuperAdmin) private readonly superAdminRepository: Repository<SuperAdmin>,
    private readonly jwtService: JwtService,
  ) {}

  async login(loginDto: LoginDto) {
    let user: any;

    // Foydalanuvchini topish
    user = await this.adminRepository.findOne({ where: { username: loginDto.username }, relations: ['profile'] });
    if (!user) {
      user = await this.teacherRepository.findOne({ where: { username: loginDto.username }, relations: ['profile'] });
    }
    if (!user) {
      user = await this.studentRepository.findOne({ where: { username: loginDto.username }, relations: ['profile'] });
    }
    if (!user) {
      user = await this.superAdminRepository.findOne({ where: { username: loginDto.username }, relations: ['profile'] });
    }

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Parolni tekshirish
    const isPasswordValid = await bcrypt.compare(loginDto.password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid password');
    }

    // JWT tokenlar yaratish
    const payload = { id: user.id, username: user.username, role: user.role };
    const accessToken = this.jwtService.sign(payload);
    const refreshToken = this.jwtService.sign(payload, { expiresIn: '30d' });

    // Refresh tokenni saqlash
    user.refreshToken = refreshToken;
    if (user instanceof Admin) {
      await this.adminRepository.save(user);
    } else if (user instanceof Teacher) {
      await this.teacherRepository.save(user);
    } else if (user instanceof Student) {
      await this.studentRepository.save(user);
    } else if (user instanceof SuperAdmin) {
      await this.superAdminRepository.save(user)
    }

    return { accessToken, refreshToken, user };
  }

  async refreshAccessToken(refreshToken: string) {
    try {
      const payload = this.jwtService.verify(refreshToken, { secret: process.env.JWT_SECRET });
      let user;

      // Role bo'yicha foydalanuvchini topish
      if (payload.role === 'admin') {
        user = await this.adminRepository.findOne({ where: { id: payload.id } });
      } else if (payload.role === 'teacher') {
        user = await this.teacherRepository.findOne({ where: { id: payload.id } });
      } else if (payload.role === 'student') {
        user = await this.studentRepository.findOne({ where: { id: payload.id } });
      } else if (payload.role === 'superAdmin') {
        user = await this.superAdminRepository.findOne({ where: { id: payload.id } });
      }

      if (!user || user.refreshToken !== refreshToken) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      const newAccessToken = this.jwtService.sign({
        id: user.id,
        username: user.username,
        role: user.role,
      });

      const newRefreshToken = this.jwtService.sign(
        { id: user.id, username: user.username, role: user.role },
        { expiresIn: '30d' },
      );

      user.refreshToken = newRefreshToken;
      if (user instanceof Admin) {
        await this.adminRepository.save(user);
      } else if (user instanceof Teacher) {
        await this.teacherRepository.save(user);
      } else if (user instanceof Student) {
        await this.studentRepository.save(user);
      } else if (user instanceof SuperAdmin) {
        await this.superAdminRepository.save(user);
      }

      return { accessToken: newAccessToken, newRefreshToken };
    } catch (error) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  async logout(userId: number) {
    let user;
    user = await this.adminRepository.findOne({ where: { id: userId } });
    if (!user) {
      user = await this.teacherRepository.findOne({ where: { id: userId } });
    }
    if (!user) {
      user = await this.studentRepository.findOne({ where: { id: userId } });
    }
    if (!user) {
      user = await this.superAdminRepository.findOne({ where: { id: userId } });
    }

    if (!user) {
      throw new NotFoundException('User not found');
    }

    user.refreshToken = null;
    if (user instanceof Admin) {
      await this.adminRepository.save(user);
    } else if (user instanceof Teacher) {
      await this.teacherRepository.save(user);
    } else if (user instanceof Student) {
      await this.studentRepository.save(user);
    } else if (user instanceof SuperAdmin) {
      await this.superAdminRepository.save(user);
    }

    return { message: 'Logged out successfully' };
  }

  async getAuthStatistics() {
    const adminCount = await this.adminRepository.count();
    const superAdminCount = await this.superAdminRepository.count();
    const teacherCount = await this.teacherRepository.count();
    const studentCount = await this.studentRepository.count();

    return {
      totalUsers: adminCount + superAdminCount + teacherCount + studentCount,
      adminCount,
      superAdminCount,
      teacherCount,
      studentCount,
    };
  }
}