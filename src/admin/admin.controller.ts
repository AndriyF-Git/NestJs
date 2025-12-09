import {
  Body,
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  ParseIntPipe,
  UseGuards,
  BadRequestException,
  Req,
} from '@nestjs/common';
import { UsersService, AdminUserSummary } from '../users/users.service';
import { AuthService } from '../auth/auth.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import type { Request } from 'express';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class AdminController {
  constructor(
    private readonly usersService: UsersService,
    private readonly authService: AuthService,
  ) {}

  @Get('users')
  async getAllUsers(): Promise<AdminUserSummary[]> {
    const users = await this.usersService.findAll();
    return users;
  }

  @Delete('users/:id')
  async deleteUser(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<{ message: string }> {
    await this.usersService.deleteUser(id);
    return { message: 'User deleted' };
  }

  @Patch('users/:id/toggle-active')
  async toggleUserActive(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<{ message: string; userId: number; isActive: boolean }> {
    const user = await this.usersService.findById(id);

    if (!user) {
      // тут можна кинути NotFoundException, але щоб коротко:
      return { message: 'User not found', userId: id, isActive: false };
    }

    const newIsActive = !user.isActive;

    await this.usersService.updateUser(id, {
      isActive: newIsActive,
      deactivatedAt: newIsActive ? null : new Date(),
    });

    return {
      message: `User has been ${newIsActive ? 'activated' : 'deactivated'}`,
      userId: id,
      isActive: newIsActive,
    };
  }

  @Patch('users/:id/role')
  async changeUserRole(
    @Param('id', ParseIntPipe) id: number,
    @Body('role') role: 'user' | 'admin',
    @Req() req: Request & { user?: { id: number; role?: 'user' | 'admin' } },
  ): Promise<{ message: string; userId: number; role: 'user' | 'admin' }> {
    // Забороняємо адмінові знімати адмінку з себе
    if (req.user?.id === id && role !== 'admin') {
      throw new BadRequestException(
        'You cannot remove admin role from your own account.',
      );
    }

    await this.usersService.updateUserRole(id, role);
    return {
      message: `Role updated to ${role}`,
      userId: id,
      role,
    };
  }

  @Post('users/:id/reset-password')
  async adminRequestPasswordReset(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<{ message: string }> {
    const user = await this.usersService.findById(id);
    if (!user) {
      return { message: 'User not found' };
    }

    // Використовуємо вже існуючу логіку
    await this.authService.requestPasswordReset(user.email);

    return { message: 'Password reset email has been sent to the user.' };
  }

  @Patch('users/:id/email')
  async adminChangeUserEmail(
    @Param('id', ParseIntPipe) id: number,
    @Body('newEmail') newEmail: string,
  ) {
    // перевірити, що такого емейлу ще немає
    const existing = await this.usersService.findByEmail(newEmail);
    if (existing && existing.id !== id) {
      throw new BadRequestException('This email is already in use');
    }

    await this.usersService.updateUser(id, { email: newEmail });

    return { message: 'Email updated', userId: id, email: newEmail };
  }
}
