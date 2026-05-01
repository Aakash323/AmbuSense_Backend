import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class VerifyDriverDto {
  @IsBoolean()
  isVerified!: boolean;

  @IsOptional()
  @IsString()
  verificationNote?: string;
}
