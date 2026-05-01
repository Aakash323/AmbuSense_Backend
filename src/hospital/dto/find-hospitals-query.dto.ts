import { IsBoolean, IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class FindHospitalsQueryDto {
  @ApiPropertyOptional({ example: 'City Care' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    enum: ['available', 'busy', 'offline'],
    example: 'available',
  })
  @IsOptional()
  @IsEnum(['available', 'busy', 'offline'])
  status?: 'available' | 'busy' | 'offline';

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  hasAvailableBeds?: boolean;
}
