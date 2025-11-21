import { BadRequestException, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';

interface CaptchaEntry {
  id: string;
  question: string;
  answer: number;
}

@Injectable()
export class CaptchaService {
  private captchas = new Map<string, CaptchaEntry>();

  createSimpleCaptcha() {
    const a = Math.floor(Math.random() * 10) + 1; // 1–10
    const b = Math.floor(Math.random() * 10) + 1;

    const id = randomUUID();
    const question = `Скільки буде ${a} + ${b}?`;
    const answer = a + b;

    const entry: CaptchaEntry = { id, question, answer };
    this.captchas.set(id, entry);

    return {
      captchaId: id,
      question,
    };
  }

  verifySimpleCaptcha(captchaId: string, captchaAnswer: number) {
    const entry = this.captchas.get(captchaId);

    if (!entry) {
      throw new BadRequestException('CAPTCHA has expired or is invalid');
    }

    const isCorrect = entry.answer === captchaAnswer;

    this.captchas.delete(captchaId);

    if (!isCorrect) {
      throw new BadRequestException('CAPTCHA answer is incorrect');
    }
  }

  // Потім тут зʼявиться метод під Google reCAPTCHA
  // async verifyRecaptchaToken(token: string) { ... }
}
