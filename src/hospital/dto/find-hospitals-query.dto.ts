import { IsBoolean, IsEnum, IsOptional, IsString } from 'class-validator';

export class FindHospitalsQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(['available', 'busy', 'offline'])
  status?: 'available' | 'busy' | 'offline';

  @IsOptional()
  @IsBoolean()
  hasAvailableBeds?: boolean;
}
