import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

interface User {
  id: number;
  email: string;
  password: string; // потім тут буде hash
}

@Injectable()
export class AuthService {
  private users: User[] = [];
  private nextId = 1;

  register(dto: RegisterDto) {
    const existing = this.users.find((u) => u.email === dto.email);
    if (existing) {
      throw new BadRequestException('User with this email already exists');
    }

    const user: User = {
      id: this.nextId++,
      email: dto.email,
      password: dto.password, // потім тут буде bcrypt.hash(...)
    };

    this.users.push(user);

    // не повертаємо пароль
    return {
      id: user.id,
      email: user.email,
    };
  }

  login(dto: LoginDto) {
    const user = this.users.find((u) => u.email === dto.email);
    if (!user) {
      // тут за умовою задачі ми потім будемо "редіректити" на реєстрацію
      throw new UnauthorizedException('User not found');
    }

    if (user.password !== dto.password) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // тут потім зʼявиться видача токена / сесії
    return {
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
      },
    };
  }
}
