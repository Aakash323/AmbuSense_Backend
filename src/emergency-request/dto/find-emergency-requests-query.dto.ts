import { IsEnum, IsMongoId, IsOptional, IsString } from 'class-validator';
import {
  EmergencyRequestStatus,
  HospitalAssignmentTechnique,
} from '../../constants/enums';

export class FindEmergencyRequestsQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(EmergencyRequestStatus)
  status?: EmergencyRequestStatus;

  @IsOptional()
  @IsMongoId()
  assignedAmbulance?: string;

  @IsOptional()
  @IsMongoId()
  assignedHospital?: string;

  @IsOptional()
  @IsEnum(HospitalAssignmentTechnique)
  hospitalAssignmentTechnique?: HospitalAssignmentTechnique;
}
