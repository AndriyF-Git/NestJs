import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import {
  Strategy,
  VerifyCallback,
  StrategyOptions,
  Profile,
} from 'passport-google-oauth20';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
  ) {
    const clientID = configService.get<string>('GOOGLE_CLIENT_ID');
    const clientSecret = configService.get<string>('GOOGLE_CLIENT_SECRET');
    const callbackURL =
      configService.get<string>('GOOGLE_CALLBACK_URL') ??
      'http://localhost:3000/auth/google/callback';

    // маленька перевірка, щоб не забути .env
    if (!clientID || !clientSecret) {
      throw new Error('Google OAuth env vars are not set');
    }

    const options: StrategyOptions = {
      clientID,
      clientSecret,
      callbackURL,
      scope: ['email', 'profile'],
    };

    super(options);
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: Profile,
    done: VerifyCallback,
  ) {
    const email = profile.emails?.[0]?.value;
    const googleId = profile.id;

    // 1. Пробуємо знайти юзера по googleId
    let user = await this.usersService.findByGoogleId(googleId);

    if (!user && email) {
      const existingByEmail = await this.usersService.findByEmail(email);
      if (existingByEmail) {
        user = await this.usersService.updateUser(existingByEmail.id, {
          googleId,
          isActive: true,
        });
      }
    }

    if (!user) {
      user = await this.usersService.createUser({
        email: email ?? `no-email-${googleId}@example.com`,
        googleId,
        isActive: true,
      });
    }

    done(null, {
      id: user.id,
      email: user.email,
    });
  }
}
