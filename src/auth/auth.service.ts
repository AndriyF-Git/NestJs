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

interface User {
  id: number;
  email: string;
  passwordHash: string;
  isActive: boolean;
  failedLoginAttempts: number;
  lockedUntil: Date | null;
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

    // Якщо юзера немає – теж логувати спробу, але без user-поля
    if (!user) {
      this.loginAttemptsService.logAttempt({
        email: dto.email,
        success: false,
        timestamp: now,
      });

      throw new UnauthorizedException('Invalid email or password');
    }

    // Перевіряємо, чи не заблокований акаунт
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

      // Якщо перевищили ліміт – блокуємо акаунт
      if (user.failedLoginAttempts >= maxFailedAttempts) {
        const lockedUntil = new Date(
          now.getTime() + lockDurationMinutes * 60 * 1000,
        );
        user.lockedUntil = lockedUntil;
      }

      this.loginAttemptsService.logAttempt({
        email: dto.email,
        success: false,
        timestamp: now,
      });

      throw new UnauthorizedException('Invalid email or password');
    }

    // Успішний логін – скидаємо лічильник
    user.failedLoginAttempts = 0;
    user.lockedUntil = null;

    this.loginAttemptsService.logAttempt({
      email: dto.email,
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

  getLoginAttempts() {
    return this.loginAttemptsService.getAllAttempts();
  }
}
