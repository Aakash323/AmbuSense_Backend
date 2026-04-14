import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsMongoId,
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
  @IsMongoId()
  assignedAmbulance?: string;

  @IsOptional()
  @IsMongoId()
  assignedHospital?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
