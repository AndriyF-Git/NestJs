import { IsEmail, IsString } from 'class-validator';

export class ChangeEmailRequestDto {
  @IsEmail()
  newEmail: string;

  @IsString()
  password: string;
}
