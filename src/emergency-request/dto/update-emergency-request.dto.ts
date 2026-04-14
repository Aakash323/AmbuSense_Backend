import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsOptional,
  IsString,
} from 'class-validator';

export class UpdateEmergencyRequestDto {
  @IsOptional()
  @IsString()
  patientName?: string;

  @IsOptional()
  @IsString()
  patientPhone?: string;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(2)
  @ArrayMaxSize(2)
  coordinates?: [number, number];

  @IsOptional()
  @IsString()
  assignedAmbulance?: string;

  @IsOptional()
  @IsString()
  assignedHospital?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
