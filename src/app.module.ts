import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { SecurityModule } from './security/security.module';
import { MailModule } from './mail/mail.module';

@Module({
  imports: [SecurityModule, MailModule, AuthModule],
  controllers: [],
  providers: [],
})
export class AppModule {}
