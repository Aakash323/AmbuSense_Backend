import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateEmergencyRequestDto {
  @IsString()
  @IsNotEmpty()
  patientName!: string;

  @IsString()
  @IsNotEmpty()
  patientPhone!: string;

  @IsArray()
  @ArrayMinSize(2)
  @ArrayMaxSize(2)
  coordinates!: [number, number];

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  assignedHospital?: string;
}