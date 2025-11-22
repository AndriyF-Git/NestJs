import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { SecurityModule } from '../security/security.module';
import { MailModule } from '../mail/mail.module';
import { UsersModule } from '../users/users.module';
@Module({
  imports: [UsersModule, SecurityModule, MailModule],
  controllers: [AuthController],
  providers: [AuthService],
})
export class AuthModule {}
