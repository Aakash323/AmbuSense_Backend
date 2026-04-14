import { IsEnum } from 'class-validator';
import { EmergencyRequestStatus } from '../../constants/enums';

export class UpdateStatusDto {
  @IsEnum(EmergencyRequestStatus)
  status!: EmergencyRequestStatus;
}
