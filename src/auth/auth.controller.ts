import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { TwoFactorToggleDto } from './dto/two-factor-toggle.dto';
import { TwoFactorVerifyDto } from './dto/two-factor-verify.dto';
import { HttpCode, HttpStatus } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { JwtAuthGuard } from './jwt-auth.guard';
import { Request } from 'express';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

interface GoogleUserPayload {
  id: number;
  email: string;
}

interface JwtUserPayload {
  id: number;
  email: string;
  twoFactorEnabled: boolean;
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('captcha')
  getCaptcha() {
    return this.authService.getCaptcha();
  }

  @Get('activate')
  activate(@Query('token') token: string) {
    return this.authService.activateAccount(token);
  }

  @Get('login-attempts')
  getLoginAttempts() {
    return this.authService.getLoginAttempts();
  }

  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }
  @Post('2fa/enable')
  @HttpCode(HttpStatus.OK)
  enableTwoFactor(@Body() dto: TwoFactorToggleDto) {
    return this.authService.enableTwoFactor(dto);
  }

  @Post('2fa/disable')
  @HttpCode(HttpStatus.OK)
  disableTwoFactor(@Body() dto: TwoFactorToggleDto) {
    return this.authService.disableTwoFactor(dto);
  }

  @Post('login/2fa')
  @HttpCode(HttpStatus.OK)
  verifyTwoFactor(@Body() dto: TwoFactorVerifyDto) {
    return this.authService.verifyTwoFactorLogin(dto);
  }
  @Get('google')
  @UseGuards(AuthGuard('google'))
  googleAuth() {
    // Нічого не робимо — Nest сам редіректить на Google
  }

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  googleCallback(@Req() req: Request & { user: GoogleUserPayload }) {
    const accessToken = this.authService.signToken(req.user);

    return {
      message: 'Login with Google successful',
      user: req.user,
      accessToken,
    };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  getMe(@Req() req: Request & { user: JwtUserPayload }) {
    return {
      id: req.user.id,
      email: req.user.email,
      twoFactorEnabled: req.user.twoFactorEnabled,
    };
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return this.authService.requestPasswordReset(dto.email);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto.token, dto.newPassword);
  }
}
