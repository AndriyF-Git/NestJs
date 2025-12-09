import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';

import { AuthModule } from './auth/auth.module';
import { SecurityModule } from './security/security.module';
import { MailModule } from './mail/mail.module';
import { AdminModule } from './admin/admin.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true, // щоб не імпортувати в кожен модуль
    }),
    TypeOrmModule.forRoot({
      type: 'sqlite',
      database: 'db.sqlite',
      autoLoadEntities: true,
      synchronize: true, // для розробки
      logging: false, // можна включити, щоб бачити SQL
    }),
    SecurityModule,
    AdminModule,
    MailModule,
    AuthModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
