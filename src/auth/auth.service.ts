import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import * as bcrypt from 'bcrypt';

interface User {
  id: number;
  email: string;
  passwordHash: string;
}

@Injectable()
export class AuthService {
  private users: User[] = [];
  private nextId = 1;

  async register(dto: RegisterDto) {
    const existing = this.users.find((u) => u.email === dto.email);
    if (existing) {
      throw new BadRequestException('User with this email already exists');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10); // saltRounds = 10

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
