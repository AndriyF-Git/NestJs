import { Injectable } from '@nestjs/common';

export interface LoginAttempt {
  email: string;
  success: boolean;
  ip?: string;
  userAgent?: string;
  timestamp: Date;
}

@Injectable()
export class LoginAttemptsService {
  private attempts: LoginAttempt[] = [];

  logAttempt(attempt: LoginAttempt) {
    this.attempts.push(attempt);
    // console.log, щоб бачити спроби
    console.log('Login attempt:', attempt);
  }

  // На майбутнє – для "адмінського" контролера
  getAllAttempts(): LoginAttempt[] {
    return this.attempts;
  }

  getAttemptsByEmail(email: string): LoginAttempt[] {
    return this.attempts.filter((a) => a.email === email);
  }
}
