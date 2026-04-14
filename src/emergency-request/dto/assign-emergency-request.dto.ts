import { IsOptional, IsString } from 'class-validator';

export class AssignEmergencyRequestDto {
  @IsOptional()
  @IsString()
  ambulanceId?: string;

  @IsOptional()
  @IsString()
  hospitalId?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}