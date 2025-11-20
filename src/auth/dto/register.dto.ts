import { IsEmail, IsInt, IsString, Matches } from 'class-validator';
import { Type } from 'class-transformer';

export class RegisterDto {
  @IsEmail()
  email: string;

  @IsString()
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/, {
    message:
      'Password must be at least 8 characters long and include upper and lower case letters, a number and a special character',
  })
  password: string;

  @IsString()
  captchaId: string;

  @Type(() => Number)
  @IsInt()
  captchaAnswer: number;
}
