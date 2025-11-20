import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [
    AuthModule,
    // тут ще буде UsersModule, MailModule, SecurityModule і тд
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
