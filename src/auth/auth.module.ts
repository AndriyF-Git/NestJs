import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { SecurityModule } from '../security/security.module';
import { MailModule } from '../mail/mail.module';
import { UsersModule } from '../users/users.module';
import { PassportModule } from '@nestjs/passport';
import { GoogleStrategy } from './google.strategy';
@Module({
  imports: [UsersModule, SecurityModule, MailModule, PassportModule],
  controllers: [AuthController],
  providers: [AuthService, GoogleStrategy],
})
export class AuthModule {}
