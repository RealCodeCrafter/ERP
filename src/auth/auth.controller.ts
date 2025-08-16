import { Controller, Post, Body, UnauthorizedException, Req, UseGuards, Res } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/create-auth.dto';
import { AuthGuard } from './auth.guard';
import { Response } from 'express';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  async login(@Body() loginDto: LoginDto, @Res() res: Response) {
    try {
      const { accessToken, user } = await this.authService.login(loginDto);
      return res.status(200).json({ accessToken, user });
    } catch (error) {
      throw new UnauthorizedException(error.message);
    }
  }

  @UseGuards(AuthGuard)
  @Post('logout')
  async logout(@Req() req: any, @Res() res: Response) {
    try {
      const userId = req.user.id;
      await this.authService.logout(userId);
      return res.status(200).json({ message: 'Logged out successfully' });
    } catch (error) {
      throw new UnauthorizedException(error.message);
    }
  }
}
