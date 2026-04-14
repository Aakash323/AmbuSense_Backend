import { IsEnum, IsMongoId, IsOptional, IsString } from 'class-validator';
import { HospitalAssignmentTechnique } from '../../constants/enums';

export class DispatchEmergencyRequestDto {
  @IsEnum(HospitalAssignmentTechnique)
  hospitalAssignmentTechnique!: HospitalAssignmentTechnique;

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
