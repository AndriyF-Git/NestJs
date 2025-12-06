import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.MAIL_HOST,
      port: Number(process.env.MAIL_PORT),
      secure: false,
      auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS,
      },
    });
  }

  async sendActivationEmail(email: string, token: string) {
    // бекендовий URL (де живе /auth/activate)
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

    console.log('Activation email sent to', email, '=>', activationLink);
  }

  async sendTwoFactorCode(email: string, code: string) {
    await this.transporter.sendMail({
      from: process.env.MAIL_FROM,
      to: email,
      subject: 'Ваш код для входу (2FA)',
      html: `
      <p>Ваш код для двофакторної аутентифікації:</p>
      <p style="font-size: 20px; font-weight: bold;">${code}</p>
      <p>Код дійсний протягом 10 хвилин.</p>
    `,
    });

    console.log('2FA code sent to', email, '=>', code);
  }

  async sendPasswordResetEmail(email: string, token: string) {
    // фронтовий URL (де живе React-сторінка /reset-password)
    const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:5173';
    const resetLink = `${frontendUrl}/reset-password?token=${token}`;

    await this.transporter.sendMail({
      to: email,
      from: process.env.MAIL_FROM ?? 'no-reply@example.com',
      subject: 'Відновлення пароля',
      text: `Щоб відновити пароль, перейдіть за посиланням: ${resetLink}`,
      html: `
        <p>Вітаю! 👋</p>
        <p>Ви (або хтось замість вас) запросили відновлення пароля.</p>
        <p>Щоб задати новий пароль, перейдіть за посиланням:</p>
        <p><a href="${resetLink}">${resetLink}</a></p>
        <p>Посилання дійсне протягом 30 хвилин.</p>
        <p>Якщо це були не ви – просто проігноруйте цей лист.</p>
      `,
    });

    console.log('Password reset email sent to', email, '=>', resetLink);
  }
}
