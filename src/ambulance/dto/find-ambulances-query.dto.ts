import { IsBoolean, IsEnum, IsOptional, IsString } from 'class-validator';
import { AmbulanceStatus } from '../../constants/enums';

export class FindAmbulancesQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(AmbulanceStatus)
  status?: AmbulanceStatus;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
