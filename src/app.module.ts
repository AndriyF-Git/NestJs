import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { SecurityModule } from './security/security.module';

@Module({
  imports: [
    SecurityModule,
    AuthModule,
    // тут ще буде UsersModule, MailModule, може ще щось
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
