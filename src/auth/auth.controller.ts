import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
  UseGuards,
  Res,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { DeactivateAccountDto } from './dto/deactivate-account.dto';
import { LoginDto } from './dto/login.dto';
import { TwoFactorToggleDto } from './dto/two-factor-toggle.dto';
import { TwoFactorVerifyDto } from './dto/two-factor-verify.dto';
import { AuthGuard } from '@nestjs/passport';
import { JwtAuthGuard } from './jwt-auth.guard';
import { Request } from 'express';
import type { Response } from 'express';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ChangeEmailRequestDto } from './dto/change-email-request.dto';

interface GoogleUserPayload {
  id: number;
  email: string;
}

interface JwtUserPayload {
  id: number;
  email: string;
  twoFactorEnabled: boolean;
  role?: 'user' | 'admin';
}

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  @Get('activate')
  activate(@Query('token') token: string) {
    return this.authService.activateAccount(token);
  }

  @Post('deactivate-account')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  deactivateAccount(
    @Req() req: Request & { user: JwtUserPayload },
    @Body() dto: DeactivateAccountDto,
  ) {
    return this.authService.deactivateAccount(req.user.id, dto);
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
  googleCallback(
    @Req() req: Request & { user: GoogleUserPayload },
    @Res() res: Response,
  ): void {
    // Якщо з якихось причин user не прийшов
    if (!req.user) {
      const frontendUrl =
        this.configService.get<string>('FRONTEND_URL') ??
        'http://localhost:5173';
      res.redirect(`${frontendUrl}/login?oauth=error`);
      return;
    }

    const accessToken = this.authService.signToken(req.user);

    const frontendUrl =
      this.configService.get<string>('FRONTEND_URL') ?? 'http://localhost:5173';

    // тут ми відправляємо токен на фронт, де він буде збережений через AuthContext
    res.redirect(`${frontendUrl}/login/oauth-success?token=${accessToken}`);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  getMe(@Req() req: Request & { user: JwtUserPayload }) {
    return {
      id: req.user.id,
      email: req.user.email,
      twoFactorEnabled: req.user.twoFactorEnabled,
      role: req.user.role,
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

  @Post('change-password')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  changePassword(
    @Req() req: Request & { user: JwtUserPayload },
    @Body() dto: ChangePasswordDto,
  ) {
    return this.authService.changePassword(req.user.id, dto);
  }

  @Post('change-email/request')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  requestEmailChange(
    @Req() req: Request & { user: JwtUserPayload },
    @Body() dto: ChangeEmailRequestDto,
  ) {
    return this.authService.requestEmailChange(req.user.id, dto);
  }

  @Get('change-email/confirm')
  @HttpCode(HttpStatus.OK)
  async confirmEmailChangeGet(
    @Query('token') token: string,
    @Res() res: Response,
  ): Promise<void> {
    if (!token) {
      res.status(400).send(`
        <html>
          <body>
            <h1>Invalid link</h1>
            <p>Token is missing.</p>
          </body>
        </html>
      `);
      return;
    }

    try {
      await this.authService.confirmEmailChange(token);

      res.send(`
        <html>
          <body>
            <h1>Email changed successfully</h1>
            <p>You can close this tab and go back to the app.</p>
          </body>
        </html>
      `);
    } catch (e) {
      console.error('Error confirming email change:', e);

      res.status(400).send(`
        <html>
          <body>
            <h1>Invalid or expired link</h1>
            <p>Please request email change again.</p>
          </body>
        </html>
      `);
    }
  }
}
