import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import * as bcrypt from 'bcrypt';
import { CaptchaService } from '../security/captcha.service';
import { MailService } from '../mail/mail.service';
import { randomUUID } from 'crypto';
import { LoginAttemptsService } from '../security/login-attempts.service';
import { TwoFactorToggleDto } from './dto/two-factor-toggle.dto';
import { TwoFactorVerifyDto } from './dto/two-factor-verify.dto';

interface User {
  id: number;
  email: string;
  passwordHash: string;
  isActive: boolean;
  failedLoginAttempts: number;
  lockedUntil: Date | null;
  twoFactorEnabled: boolean;
  twoFactorLoginCode: string | null;
  twoFactorLoginCodeExpiresAt: Date | null;
}

interface ActivationToken {
  token: string;
  userId: number;
  expiresAt: Date;
  used: boolean;
}

@Injectable()
export class AuthService {
  private users: User[] = [];
  private nextId = 1;

  private activationTokens = new Map<string, ActivationToken>();

  constructor(
    private readonly captchaService: CaptchaService,
    private readonly mailService: MailService,
    private readonly loginAttemptsService: LoginAttemptsService,
  ) {}

  getCaptcha() {
    return this.captchaService.createSimpleCaptcha();
  }
  private generateTwoFactorCode(): string {
    return String(Math.floor(100000 + Math.random() * 900000));
  }

  async register(dto: RegisterDto) {
    // Перевірка CAPTCHA
    this.captchaService.verifySimpleCaptcha(dto.captchaId, dto.captchaAnswer);

    // Перевірка унікальності email
    const existing = this.users.find((u) => u.email === dto.email);
    if (existing) {
      throw new BadRequestException('User with this email already exists');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const user: User = {
      id: this.nextId++,
      email: dto.email,
      passwordHash,
      isActive: false,
      failedLoginAttempts: 0,
      lockedUntil: null,
      twoFactorEnabled: false,
      twoFactorLoginCode: null,
      twoFactorLoginCodeExpiresAt: null,
    };

    this.users.push(user);

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

    return {
      id: user.id,
      email: user.email,
      message:
        'User registered. Please check your email to activate your account.',
    };
  }

  activateAccount(token: string) {
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

    const user = this.users.find((u) => u.id === entry.userId);
    if (!user) {
      this.activationTokens.delete(token);
      throw new BadRequestException('User for this token was not found');
    }

    user.isActive = true;
    entry.used = true;

    return {
      message: 'Account activated successfully',
      email: user.email,
    };
  }

  async login(dto: LoginDto) {
    const user = this.users.find((u) => u.email === dto.email);

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
        email: dto.email,
        success: false,
        timestamp: now,
      });

      throw new UnauthorizedException(
        `Account is temporarily locked until ${user.lockedUntil.toISOString()}`,
      );
    }

    if (!user.isActive) {
      this.loginAttemptsService.logAttempt({
        email: dto.email,
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
      user.failedLoginAttempts += 1;

      if (user.failedLoginAttempts >= maxFailedAttempts) {
        const lockedUntil = new Date(
          now.getTime() + lockDurationMinutes * 60 * 1000,
        );
        user.lockedUntil = lockedUntil;
      }

      this.loginAttemptsService.logAttempt({
        email: user.email,
        success: false,
        timestamp: now,
      });

      throw new UnauthorizedException('Invalid email or password');
    }

    // пароль вірний, обнуляємо лічильник
    user.failedLoginAttempts = 0;
    user.lockedUntil = null;

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
      };
    }

    // Якщо 2FA увімкнена, шлемо код на пошту і не логінимо одразу
    const code = this.generateTwoFactorCode();
    user.twoFactorLoginCode = code;
    user.twoFactorLoginCodeExpiresAt = new Date(
      now.getTime() + 10 * 60 * 1000, // 10 хв
    );

    await this.mailService.sendTwoFactorCode(user.email, code);

    // Лог: пароль пройшов, але повний логін ще не завершено
    this.loginAttemptsService.logAttempt({
      email: user.email,
      success: false,
      timestamp: now,
    });

    return {
      message: 'Two-factor authentication code has been sent to your email',
      twoFactorRequired: true,
    };
  }

  getLoginAttempts() {
    return this.loginAttemptsService.getAllAttempts();
  }

  async enableTwoFactor(dto: TwoFactorToggleDto) {
    const user = this.users.find((u) => u.email === dto.email);
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

    user.twoFactorEnabled = true;

    return {
      message: 'Two-factor authentication has been enabled for your account',
    };
  }

  async disableTwoFactor(dto: TwoFactorToggleDto) {
    const user = this.users.find((u) => u.email === dto.email);
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
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

    user.twoFactorEnabled = false;
    user.twoFactorLoginCode = null;
    user.twoFactorLoginCodeExpiresAt = null;

    return {
      message: 'Two-factor authentication has been disabled for your account',
    };
  }

  verifyTwoFactorLogin(dto: TwoFactorVerifyDto) {
    const user = this.users.find((u) => u.email === dto.email);
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
      user.twoFactorLoginCode = null;
      user.twoFactorLoginCodeExpiresAt = null;
      throw new UnauthorizedException('2FA code has expired or is invalid');
    }

    if (user.twoFactorLoginCode !== dto.code) {
      throw new UnauthorizedException('Invalid 2FA code');
    }

    // Код вірний – очищаємо його
    user.twoFactorLoginCode = null;
    user.twoFactorLoginCodeExpiresAt = null;

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
    };
  }
}
