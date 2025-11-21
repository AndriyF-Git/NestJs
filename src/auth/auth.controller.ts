import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { TwoFactorToggleDto } from './dto/two-factor-toggle.dto';
import { TwoFactorVerifyDto } from './dto/two-factor-verify.dto';

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
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }
  @Post('2fa/enable')
  enableTwoFactor(@Body() dto: TwoFactorToggleDto) {
    return this.authService.enableTwoFactor(dto);
  }

  @Post('2fa/disable')
  disableTwoFactor(@Body() dto: TwoFactorToggleDto) {
    return this.authService.disableTwoFactor(dto);
  }

  @Post('login/2fa')
  verifyTwoFactor(@Body() dto: TwoFactorVerifyDto) {
    return this.authService.verifyTwoFactorLogin(dto);
  }
}
