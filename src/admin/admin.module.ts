import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { UsersModule } from '../users/users.module';
import { RolesGuard } from '../auth/roles.guard';
import { AuthModule } from 'src/auth/auth.module';

@Module({
  imports: [UsersModule, AuthModule],
  controllers: [AdminController],
  providers: [RolesGuard],
})
export class AdminModule {}
