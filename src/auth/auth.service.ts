import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';

interface User {
  id: number;
  email: string;
  passwordHash: string;
}

interface CaptchaEntry {
  id: string;
  question: string;
  answer: number;
}

@Injectable()
export class AuthService {
  private users: User[] = [];
  private nextId = 1;

  // Просте зберігання CAPTCHA в памʼяті
  private captchas = new Map<string, CaptchaEntry>();

  createCaptcha() {
    const a = Math.floor(Math.random() * 10) + 1; // 1–10
    const b = Math.floor(Math.random() * 10) + 1;

    const id = randomUUID();
    const question = `Скільки буде ${a} + ${b}?`;
    const answer = a + b;

    const entry: CaptchaEntry = { id, question, answer };
    this.captchas.set(id, entry);

    // фронту повертаємо тільки id і question
    return {
      captchaId: id,
      question,
    };
  }

  private verifyCaptcha(captchaId: string, captchaAnswer: number) {
    const entry = this.captchas.get(captchaId);

    if (!entry) {
      throw new BadRequestException('CAPTCHA has expired or is invalid');
    }

    const isCorrect = entry.answer === captchaAnswer;

    // одноразове використання
    this.captchas.delete(captchaId);

    if (!isCorrect) {
      throw new BadRequestException('CAPTCHA answer is incorrect');
    }
  }

  async register(dto: RegisterDto) {
    this.verifyCaptcha(dto.captchaId, dto.captchaAnswer);

    const existing = this.users.find((u) => u.email === dto.email);
    if (existing) {
      throw new BadRequestException('User with this email already exists');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const user: User = {
      id: this.nextId++,
      email: dto.email,
      passwordHash,
    };

    this.users.push(user);

    return {
      id: user.id,
      email: user.email,
    };
  }

  async login(dto: LoginDto) {
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

    return {
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
      },
    };
  }
}
