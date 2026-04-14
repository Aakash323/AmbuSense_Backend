import { IsOptional, IsString } from 'class-validator';

export class CancelEmergencyRequestDto {
  @IsOptional()
  @IsString()
  reason?: string;
}
