import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.MAIL_HOST,
      port: Number(process.env.MAIL_PORT),
      secure: false, // true зазвичай тільки для 465
      auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS,
      },
    });
  }

  async sendActivationEmail(email: string, token: string) {
    const appUrl = process.env.APP_URL ?? 'http://localhost:3000';
    const activationLink = `${appUrl}/auth/activate?token=${token}`;

    await this.transporter.sendMail({
      to: email,
      from: process.env.MAIL_FROM ?? 'no-reply@example.com',
      subject: 'Активація облікового запису',
      text: `Для активації акаунта перейдіть за посиланням: ${activationLink}`,
      html: `
        <p>Вітаємо! 👋</p>
        <p>Щоб активувати свій обліковий запис, натисніть на кнопку нижче:</p>
        <p>
          <a href="${activationLink}"
             style="display:inline-block;padding:10px 20px;border-radius:4px;
                    background:#2563eb;color:#ffffff;text-decoration:none;">
            Активувати акаунт
          </a>
        </p>
        <p>Або скопіюйте це посилання в адресний рядок браузера:</p>
        <p><code>${activationLink}</code></p>
      `,
    });

    // Лог для себе
    console.log('Activation email sent to', email, '=>', activationLink);
  }
}
