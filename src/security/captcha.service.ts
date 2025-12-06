import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
// import { randomUUID } from 'crypto';

@Injectable()
export class CaptchaService {
  constructor(private readonly configService: ConfigService) {}

  async verifyRecaptchaToken(token: string | undefined) {
    if (!token) {
      throw new BadRequestException('reCAPTCHA token is missing');
    }

    const secret = this.configService.get<string>('RECAPTCHA_SECRET_KEY');
    if (!secret) {
      throw new Error('RECAPTCHA_SECRET_KEY is not configured');
    }

    // якщо в тебе Node 18+ – можна використовувати глобальний fetch
    const params = new URLSearchParams();
    params.append('secret', secret);
    params.append('response', token);

    const response = await fetch(
      'https://www.google.com/recaptcha/api/siteverify',
      {
        method: 'POST',
        body: params,
      },
    );

    const data = (await response.json()) as {
      success: boolean;
      score?: number;
      'error-codes'?: string[];
    };

    if (!data.success) {
      throw new BadRequestException('Failed to verify reCAPTCHA token');
    }

    // Якщо буде юзатись reCAPTCHA v3, можна ще порог по score перевіряти
    // if (data.score !== undefined && data.score < 0.5) { ... }
  }
}
