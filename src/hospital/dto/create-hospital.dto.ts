import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateHospitalDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsNotEmpty()
  phone!: string;

  @IsString()
  @IsNotEmpty()
  address!: string;

  @IsOptional()
  @IsEnum(['available', 'busy', 'offline'])
  status?: 'available' | 'busy' | 'offline';

  @IsInt()
  @Min(0)
  capacity!: number;

  @IsInt()
  @Min(0)
  availableBeds!: number;

  @IsOptional()
  @IsArray()
  specialization?: string[];

  @IsArray()
  @ArrayMinSize(2)
  @ArrayMaxSize(2)
  coordinates!: [number, number];
}
