import { Module } from '@nestjs/common';
import { CaptchaService } from './captcha.service';

@Module({
  providers: [CaptchaService],
  exports: [CaptchaService], // важливо: щоб інші модулі могли його використовували
})
export class SecurityModule {}
