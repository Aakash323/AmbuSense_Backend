import { IsBoolean, IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { AmbulanceStatus } from '../../constants/enums';

export class FindAmbulancesQueryDto {
  @ApiPropertyOptional({ example: 'AMB-102' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    enum: AmbulanceStatus,
    example: AmbulanceStatus.AVAILABLE,
  })
  @IsOptional()
  @IsEnum(AmbulanceStatus)
  status?: AmbulanceStatus;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
