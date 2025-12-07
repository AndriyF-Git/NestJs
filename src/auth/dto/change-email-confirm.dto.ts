import { IsString } from 'class-validator';

export class ChangeEmailConfirmDto {
  @IsString()
  token: string;
}
