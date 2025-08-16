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
import { SuperAdmin } from 'src/super-admin/entities/super-admin.entity';

type RoleName = 'admin' | 'teacher' | 'student' | 'superadmin';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(Admin) private readonly adminRepository: Repository<Admin>,
    @InjectRepository(Teacher) private readonly teacherRepository: Repository<Teacher>,
    @InjectRepository(Student) private readonly studentRepository: Repository<Student>,
    @InjectRepository(SuperAdmin) private readonly superAdminRepository: Repository<SuperAdmin>,
    private readonly jwtService: JwtService,
  ) {}

  private async findUserWithPasswordByUsername(
    username: string,
  ): Promise<{ user: any; role: RoleName } | null> {
    // Har bir rol bo‘yicha parolni majburan addSelect qilamiz (select:false bo‘lsa ham)
    const lookups: Array<{
      repo: Repository<any>;
      alias: string;
      role: RoleName;
    }> = [
      { repo: this.adminRepository, alias: 'admin', role: 'admin' },
      { repo: this.teacherRepository, alias: 'teacher', role: 'teacher' },
      { repo: this.studentRepository, alias: 'student', role: 'student' },
      { repo: this.superAdminRepository, alias: 'superadmin', role: 'superadmin' },
    ];

    for (const { repo, alias, role } of lookups) {
      const qb = repo
        .createQueryBuilder(alias)
        .where(`${alias}.username = :username`, { username })
        .addSelect(`${alias}.password`); // password ustuni select:false bo‘lsa ham olib keladi

      const found = await qb.getOne();
      if (found) {
        return { user: found, role };
      }
    }
    return null;
  }

  private looksHashed(password: string): boolean {
    if (typeof password !== 'string') return false;
    // bcrypt: $2a$, $2b$, $2y$; (ixtiyoriy qo‘shimcha) argon2: $argon2...
    return password.startsWith('$2a$') || password.startsWith('$2b$') || password.startsWith('$2y$') || password.startsWith('$argon2');
  }

  async login(loginDto: { username: string; password: string }) {
    const { username, password } = loginDto;

    const result = await this.findUserWithPasswordByUsername(username);
    if (!result) {
      throw new NotFoundException('User not found');
    }

    const { user, role } = result;

    if (!user.password) {
      throw new UnauthorizedException('User has no password set');
    }

    // Parolni tekshirish: hash bo‘lsa bcrypt.compare, bo‘lmasa oddiy solishtirish
    let isValid = false;
    if (this.looksHashed(user.password)) {
      isValid = await bcrypt.compare(password, user.password);
    } else {
      isValid = user.password === password;
    }

    if (!isValid) {
      throw new UnauthorizedException('Parol noto‘g‘ri');
    }

    // JWT (muddatsiz)
    const payload = {
      id: user.id,
      username: user.username,
      role: user.role ?? role, // entityda role bo‘lmasa ham payloadga qo‘shamiz
    };

    const accessToken = this.jwtService.sign(payload, {
      secret: process.env.JWT_SECRET,
      // expiresIn qo‘ymaymiz — muddatsiz bo‘lishi uchun
    });

    // Parolni qaytarmaymiz
    const { password: _omit, ...safeUser } = user;

    return { accessToken, user: { ...safeUser, role: payload.role } };
  }

  async logout(userId: number) {
    return { message: `User ${userId} logged out successfully` };
  }
}
