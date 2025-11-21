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

interface User {
  id: number;
  email: string;
  passwordHash: string;
  isActive: boolean;
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
      isActive: false, // новий користувач поки не активний
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

    // Надсилаємо лист (поки лог у консоль)
    this.mailService.sendActivationEmail(user.email, token);

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

    return {
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
      },
    };
  }
}
