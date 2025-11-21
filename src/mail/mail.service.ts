import { Injectable } from '@nestjs/common';

@Injectable()
export class MailService {
  sendActivationEmail(email: string, token: string) {
    const activationLink = `http://localhost:3000/auth/activate?token=${token}`;

    // просто лог в консоль
    console.log('==== ACTIVATION EMAIL MOCK ====');
    console.log(`To: ${email}`);
    console.log(`Activation link: ${activationLink}`);
    console.log('===============================');
  }
}
