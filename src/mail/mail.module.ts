import { Module } from '@nestjs/common';
import { MailService } from './mail.service';

@Module({
  providers: [MailService],
  exports: [MailService], // щоб інші модулі могли його інжектити
})
export class MailModule {}
