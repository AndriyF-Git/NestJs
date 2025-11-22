import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
  ) {}

  findByEmail(email: string) {
    return this.usersRepo.findOne({ where: { email } });
  }

  findById(id: number) {
    return this.usersRepo.findOne({ where: { id } });
  }

  findByGoogleId(googleId: string) {
    return this.usersRepo.findOne({ where: { googleId } });
  }

  async createUser(data: Partial<User>) {
    const user = this.usersRepo.create(data);
    return this.usersRepo.save(user);
  }

  async updateUser(id: number, data: Partial<User>) {
    await this.usersRepo.update(id, data);
    return this.findById(id);
  }

  async incrementFailedAttempts(id: number) {
    const user = await this.findById(id);

    if (!user) {
      // для безпеки краще зафейлити
      throw new Error(
        `User with id ${id} not found in incrementFailedAttempts`,
      );
    }

    const attempts = (user.failedLoginAttempts ?? 0) + 1;

    await this.usersRepo.update(id, {
      failedLoginAttempts: attempts,
    });

    return attempts;
  }

  async resetFailedAttempts(id: number) {
    await this.usersRepo.update(id, { failedLoginAttempts: 0 });
  }
}
