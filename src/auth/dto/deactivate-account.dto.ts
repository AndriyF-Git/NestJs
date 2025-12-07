import { IsOptional, IsString } from 'class-validator';

export class DeactivateAccountDto {
  @IsString()
  password: string;

  @IsOptional()
  @IsString()
  reason?: string;
}
