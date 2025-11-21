import { Module } from '@nestjs/common';
import { CaptchaService } from './captcha.service';
import { LoginAttemptsService } from './login-attempts.service';

@Module({
  providers: [CaptchaService, LoginAttemptsService],
  exports: [CaptchaService, LoginAttemptsService],
})
export class SecurityModule {}
