import { IsEmail, IsString } from 'class-validator';

export class TwoFactorToggleDto {
  @IsEmail()
  email: string;

  @IsString()
  password: string;
}
