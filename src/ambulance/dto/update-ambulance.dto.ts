import { IsOptional, IsString, IsEnum, IsArray } from 'class-validator';

export class UpdateAmbulanceDto {
  @IsOptional()
  @IsString()
  ambulanceCode?: string;

  @IsOptional()
  @IsString()
  driverName?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsEnum(['available', 'on-duty', 'busy', 'offline'])
  status?: 'available' | 'on-duty' | 'busy' | 'offline';

  @IsOptional()
  @IsArray()
  coordinates?: [number, number];
}