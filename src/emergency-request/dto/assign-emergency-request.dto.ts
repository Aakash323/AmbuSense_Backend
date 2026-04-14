import { IsMongoId, IsOptional, IsString } from 'class-validator';

export class AssignEmergencyRequestDto {
  @IsOptional()
  @IsMongoId()
  ambulanceId?: string;

  @IsOptional()
  @IsMongoId()
  hospitalId?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
