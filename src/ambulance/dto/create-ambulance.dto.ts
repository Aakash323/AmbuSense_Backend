import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  ArrayMinSize,
  ArrayMaxSize,
  IsBoolean,
} from 'class-validator';
import { AmbulanceStatus } from '../../constants/enums';

export class CreateAmbulanceDto {
  @IsString()
  @IsNotEmpty()
  ambulanceCode!: string;

  @IsString()
  @IsNotEmpty()
  driverName!: string;

  @IsString()
  @IsNotEmpty()
  phone!: string;

  @IsOptional()
  @IsEnum(AmbulanceStatus)
  status?: AmbulanceStatus;

  @IsArray()
  @ArrayMinSize(2)
  @ArrayMaxSize(2)
  coordinates!: [number, number];

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
