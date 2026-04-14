import { IsEnum } from 'class-validator';
import { AmbulanceStatus } from '../../constants/enums';

export class UpdateAmbulanceStatusDto {
  @IsEnum(AmbulanceStatus)
  status!: AmbulanceStatus;
}
