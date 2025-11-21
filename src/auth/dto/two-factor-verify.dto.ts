import { IsEmail, IsString, Length } from 'class-validator';

export class TwoFactorVerifyDto {
  @IsEmail()
  email: string;

  @IsString()
  @Length(6, 6, { message: '2FA code must be 6 digits long' })
  code: string;
}
