import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RegisterDto } from './dto/register.dto';
import { DeactivateAccountDto } from './dto/deactivate-account.dto';
import { LoginDto } from './dto/login.dto';
import * as bcrypt from 'bcrypt';
import { CaptchaService } from '../security/captcha.service';
import { MailService } from '../mail/mail.service';
import { randomUUID } from 'crypto';
import { LoginAttemptsService } from '../security/login-attempts.service';
import { TwoFactorToggleDto } from './dto/two-factor-toggle.dto';
import { TwoFactorVerifyDto } from './dto/two-factor-verify.dto';
import { UsersService } from '../users/users.service';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ChangeEmailRequestDto } from './dto/change-email-request.dto';
import { JwtService } from '@nestjs/jwt';

interface ActivationToken {
  token: string;
  userId: number;
  expiresAt: Date;
  used: boolean;
}

@Injectable()
export class AuthService {
  private activationTokens = new Map<string, ActivationToken>();
  private readonly resetTokenTtlMinutes: number;
  private readonly emailChangeTokenTtlMinutes: number;
  private emailChangeTokens = new Map<
    string,
    { userId: number; newEmail: string; expiresAt: Date; used: boolean }
  >();

  constructor(
    private readonly captchaService: CaptchaService,
    private readonly mailService: MailService,
    private readonly loginAttemptsService: LoginAttemptsService,
    private readonly usersService: UsersService,
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
  ) {
    this.resetTokenTtlMinutes = Number(
      this.configService.get<string>('PASSWORD_RESET_TOKEN_TTL_MINUTES') ??
        '30',
    );
    this.emailChangeTokenTtlMinutes =
      this.configService.get<number>('EMAIL_CHANGE_TTL_MINUTES') ?? 60;
  }

  private generateTwoFactorCode(): string {
    return String(Math.floor(100000 + Math.random() * 900000));
  }

  signToken(user: { id: number; email: string }) {
    return this.jwtService.sign({
      sub: user.id,
      email: user.email,
    });
  }

  async register(dto: RegisterDto) {
    if (!dto.recaptchaToken) {
      throw new BadRequestException('reCAPTCHA token is required');
    }

    await this.captchaService.verifyRecaptchaToken(dto.recaptchaToken);
    // Перевірка унікальності email
    const existing = await this.usersService.findByEmail(dto.email);
    if (existing) {
      throw new BadRequestException('User with this email already exists');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const user = await this.usersService.createUser({
      email: dto.email,
      passwordHash,
      isActive: false,
    });

    // Генеруємо токен активації
    const token = randomUUID();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 години

    this.activationTokens.set(token, {
      token,
      userId: user.id,
      expiresAt,
      used: false,
    });

    // Надсилаємо лист
    await this.mailService.sendActivationEmail(user.email, token);

    const response: any = {
      id: user.id,
      email: user.email,
      message:
        'User registered. Please check your email to activate your account.',
    };

    // Не попадає в продакш, але всеодно потім видалю токен з JSON після тестів
    const appEnv = this.configService.get<string>('APP_ENV');
    if (appEnv === 'development') {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      response.activationToken = token;
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return response;
  }

  async activateAccount(token: string) {
    const entry = this.activationTokens.get(token);

    if (!entry) {
      throw new BadRequestException('Invalid or expired activation token');
    }

    if (entry.used) {
      throw new BadRequestException('Activation token has already been used');
    }

    if (entry.expiresAt.getTime() < Date.now()) {
      this.activationTokens.delete(token);
      throw new BadRequestException('Activation token has expired');
    }

    const user = await this.usersService.findById(entry.userId);
    if (!user) {
      this.activationTokens.delete(token);
      throw new BadRequestException('User for this token was not found');
    }

    await this.usersService.updateUser(user.id, { isActive: true });
    entry.used = true;

    return {
      message: 'Account activated successfully',
      email: user.email,
    };
  }

  async deactivateAccount(userId: number, dto: DeactivateAccountDto) {
    const user = await this.usersService.findById(userId);

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    if (!user.passwordHash) {
      throw new BadRequestException(
        'This account type cannot be deactivated this way',
      );
    }

    const isPasswordValid = await bcrypt.compare(
      dto.password,
      user.passwordHash,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Password is incorrect');
    }

    await this.usersService.updateUser(user.id, {
      isActive: false,
      deactivatedAt: new Date(),
    });

    return {
      message: 'Account has been deactivated',
    };
  }

  async login(dto: LoginDto) {
    const user = await this.usersService.findByEmail(dto.email);

    const now = new Date();
    const lockDurationMinutes = 15;
    const maxFailedAttempts = 5;

    if (!user) {
      this.loginAttemptsService.logAttempt({
        email: dto.email,
        success: false,
        timestamp: now,
      });

      throw new UnauthorizedException('Invalid email or password');
    }

    if (user.lockedUntil && user.lockedUntil.getTime() > now.getTime()) {
      this.loginAttemptsService.logAttempt({
        email: user.email,
        success: false,
        timestamp: now,
      });

      throw new UnauthorizedException(
        `Account is temporarily locked until ${user.lockedUntil.toISOString()}`,
      );
    }

    if (!user.isActive) {
      this.loginAttemptsService.logAttempt({
        email: user.email,
        success: false,
        timestamp: now,
      });

      throw new UnauthorizedException(
        'Account is not activated. Please check your email.',
      );
    }

    const isPasswordValid = await bcrypt.compare(
      dto.password,
      user.passwordHash,
    );

    if (!isPasswordValid) {
      const attempts = await this.usersService.incrementFailedAttempts(user.id);

      let lockedUntil = user.lockedUntil;
      if (attempts >= maxFailedAttempts) {
        lockedUntil = new Date(now.getTime() + lockDurationMinutes * 60 * 1000);
        await this.usersService.updateUser(user.id, { lockedUntil });
      }

      this.loginAttemptsService.logAttempt({
        email: user.email,
        success: false,
        timestamp: now,
      });

      throw new UnauthorizedException('Invalid email or password');
    }

    // пароль вірний, обнуляємо лічильник
    await this.usersService.updateUser(user.id, {
      failedLoginAttempts: 0,
      lockedUntil: null,
    });

    // Якщо 2FA вимкнена – логін як раніше
    if (!user.twoFactorEnabled) {
      this.loginAttemptsService.logAttempt({
        email: user.email,
        success: true,
        timestamp: now,
      });

      return {
        message: 'Login successful',
        user: {
          id: user.id,
          email: user.email,
        },
        accessToken: this.signToken({ id: user.id, email: user.email }),
      };
    }

    // Якщо 2FA увімкнена, шлемо код на пошту і не логінимо одразу
    const code = this.generateTwoFactorCode();

    await this.usersService.updateUser(user.id, {
      twoFactorLoginCode: code,
      twoFactorLoginCodeExpiresAt: new Date(now.getTime() + 10 * 60 * 1000), // 10 хв
    });

    await this.mailService.sendTwoFactorCode(user.email, code);

    // Лог: пароль пройшов, але повний логін ще не завершено
    this.loginAttemptsService.logAttempt({
      email: user.email,
      success: false,
      timestamp: now,
    });

    const appEnv = this.configService.get<string>('APP_ENV');

    const response: any = {
      message: 'Two-factor authentication code has been sent to your email',
      twoFactorRequired: true,
    };

    if (appEnv === 'development') {
      // повертаємо код, щоб Postman міг його підхопити
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      response.twoFactorCode = code;
    }
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return response;
  }

  getLoginAttempts() {
    return this.loginAttemptsService.getAllAttempts();
  }

  async enableTwoFactor(dto: TwoFactorToggleDto) {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (!user.isActive) {
      throw new UnauthorizedException(
        'Account is not activated. Please check your email.',
      );
    }

    const isPasswordValid = await bcrypt.compare(
      dto.password,
      user.passwordHash,
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (user.twoFactorEnabled) {
      throw new BadRequestException(
        'Two-factor authentication is already enabled',
      );
    }

    await this.usersService.updateUser(user.id, { twoFactorEnabled: true });

    return {
      message: 'Two-factor authentication has been enabled for your account',
    };
  }

  async disableTwoFactor(dto: TwoFactorToggleDto) {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (!user.isActive) {
      throw new UnauthorizedException(
        'Account is not activated. Please check your email.',
      );
    }

    const isPasswordValid = await bcrypt.compare(
      dto.password,
      user.passwordHash,
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (!user.twoFactorEnabled) {
      throw new BadRequestException('Two-factor authentication is not enabled');
    }

    await this.usersService.updateUser(user.id, {
      twoFactorEnabled: false,
      twoFactorLoginCode: null,
      twoFactorLoginCodeExpiresAt: null,
    });

    return {
      message: 'Two-factor authentication has been disabled for your account',
    };
  }

  async verifyTwoFactorLogin(dto: TwoFactorVerifyDto) {
    const user = await this.usersService.findByEmail(dto.email);
    const now = new Date();

    if (!user) {
      throw new UnauthorizedException('Invalid email or 2FA code');
    }

    if (!user.twoFactorEnabled) {
      throw new BadRequestException('Two-factor authentication is not enabled');
    }

    if (
      !user.twoFactorLoginCode ||
      !user.twoFactorLoginCodeExpiresAt ||
      user.twoFactorLoginCodeExpiresAt.getTime() < now.getTime()
    ) {
      await this.usersService.updateUser(user.id, {
        twoFactorLoginCode: null,
        twoFactorLoginCodeExpiresAt: null,
      });
      throw new UnauthorizedException('2FA code has expired or is invalid');
    }

    if (user.twoFactorLoginCode !== dto.code) {
      throw new UnauthorizedException('Invalid 2FA code');
    }

    // Код вірний – очищаємо його
    await this.usersService.updateUser(user.id, {
      twoFactorLoginCode: null,
      twoFactorLoginCodeExpiresAt: null,
    });

    this.loginAttemptsService.logAttempt({
      email: user.email,
      success: true,
      timestamp: now,
    });

    return {
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
      },
      accessToken: this.signToken({ id: user.id, email: user.email }),
    };
  }

  async changePassword(userId: number, dto: ChangePasswordDto) {
    const user = await this.usersService.findById(userId);

    if (!user) {
      // теоретично не має статись, бо userId беремо з валідного JWT
      throw new UnauthorizedException('User not found');
    }

    if (!user.isActive) {
      throw new UnauthorizedException(
        'Account is not activated. Please check your email.',
      );
    }

    if (!user.passwordHash) {
      // Наприклад, акаунт створений тільки через Google OAuth
      throw new BadRequestException(
        'Password cannot be changed for this type of account',
      );
    }

    const isCurrentPasswordValid = await bcrypt.compare(
      dto.currentPassword,
      user.passwordHash,
    );

    if (!isCurrentPasswordValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    if (dto.currentPassword === dto.newPassword) {
      throw new BadRequestException(
        'New password must be different from the current password',
      );
    }

    const newPasswordHash = await bcrypt.hash(dto.newPassword, 10);

    await this.usersService.updateUser(user.id, {
      passwordHash: newPasswordHash,
      // Сюди пізніше можна додати lastPasswordChangeAt, tokenVersion++ і т.д.
    });

    return {
      message: 'Password changed successfully',
    };
  }

  async requestPasswordReset(email: string) {
    const user = await this.usersService.findByEmail(email);

    // Щоб не "палити" існування акаунта, завжди повертаємо success
    if (!user) {
      console.log(`Password reset requested for non-existing email: ${email}`);
      return {
        message:
          'If this email is registered, a password reset link has been sent.',
      };
    }

    if (!user.isActive) {
      throw new BadRequestException('Account is not activated');
    }

    const token = randomUUID();
    const expiresAt = new Date(
      Date.now() + this.resetTokenTtlMinutes * 60 * 1000,
    );

    await this.usersService.setPasswordResetToken(user.id, token, expiresAt);
    await this.mailService.sendPasswordResetEmail(user.email, token);

    const appEnv = this.configService.get<string>('APP_ENV');

    const response: any = {
      message:
        'If this email is registered, a password reset link has been sent.',
    };

    // В dev повертаємо токен, щоб зручно тестити через Postman
    if (appEnv === 'development') {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      response.token = token;
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return response;
  }

  async resetPassword(token: string, newPassword: string) {
    const user = await this.usersService.findByResetPasswordToken(token);

    if (!user) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    if (
      !user.resetPasswordExpires ||
      user.resetPasswordExpires.getTime() < Date.now()
    ) {
      // Токен прострочений
      await this.usersService.clearPasswordResetToken(user.id);
      throw new BadRequestException('Reset token has expired');
    }

    // Додаткова перевірка політики пароля (на всякий випадок)
    const passwordRegex =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

    if (!passwordRegex.test(newPassword)) {
      throw new BadRequestException(
        'Password does not meet security requirements',
      );
    }

    const saltRounds = 10;
    const hash = await bcrypt.hash(newPassword, saltRounds);

    await this.usersService.updatePassword(user.id, hash);
    await this.usersService.clearPasswordResetToken(user.id);

    // Можна також обнулити лічильник невдалих спроб
    await this.usersService.resetFailedAttempts(user.id);

    return {
      message: 'Password has been successfully reset',
    };
  }

  async requestEmailChange(userId: number, dto: ChangeEmailRequestDto) {
    const user = await this.usersService.findById(userId);

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Account is not activated');
    }

    if (!user.passwordHash) {
      throw new BadRequestException(
        'Email cannot be changed for this type of account',
      );
    }

    const isPasswordValid = await bcrypt.compare(
      dto.password,
      user.passwordHash,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    const existing = await this.usersService.findByEmail(dto.newEmail);
    if (existing && existing.id !== user.id) {
      throw new BadRequestException('This email is already in use');
    }

    const token = randomUUID();
    const expiresAt = new Date(
      Date.now() + this.emailChangeTokenTtlMinutes * 60 * 1000,
    );

    this.emailChangeTokens.set(token, {
      userId: user.id,
      newEmail: dto.newEmail,
      expiresAt,
      used: false,
    });

    const appUrl =
      this.configService.get<string>('APP_URL') ?? 'http://localhost:3000';

    // Лінк без фронта (можна відкривати напряму, отримаєш JSON)
    const confirmLink = `${appUrl}/auth/change-email/confirm?token=${token}`;

    await this.mailService.sendEmailChangeConfirmation(
      dto.newEmail,
      confirmLink,
    );

    return {
      message:
        'Confirmation link has been sent to the new email address. Please check your inbox.',
    };
  }

  async confirmEmailChange(token: string) {
    const entry = this.emailChangeTokens.get(token);

    if (!entry || entry.used) {
      throw new BadRequestException('Invalid or already used token');
    }

    const now = new Date();
    if (entry.expiresAt.getTime() < now.getTime()) {
      this.emailChangeTokens.delete(token);
      throw new BadRequestException('Token has expired');
    }

    const user = await this.usersService.findById(entry.userId);
    if (!user) {
      this.emailChangeTokens.delete(token);
      throw new BadRequestException('User for this token was not found');
    }

    await this.usersService.updateUser(user.id, {
      email: entry.newEmail,
    });

    entry.used = true;

    return {
      message: 'Email changed successfully',
      email: entry.newEmail,
    };
  }
}
