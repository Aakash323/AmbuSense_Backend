import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { UserRole } from '../constants/enums';
import type { UserDocument } from '../users/entities/user.entity';
import { UpdateStatusDto } from './dto/update-status.dto';
import { EmergencyRequestService } from './emergency-request.service';

@Controller('driver/my-trip')
@UseGuards(AuthGuard, RolesGuard)
@Roles(UserRole.DRIVER)
export class DriverTripsController {
  constructor(
    private readonly emergencyRequestService: EmergencyRequestService,
  ) {}

  @Get()
  findMyTrip(@CurrentUser() user: UserDocument) {
    return this.emergencyRequestService.findMyTrip(user);
  }

  @Patch('status')
  updateStatus(
    @Body() dto: UpdateStatusDto,
    @CurrentUser() user: UserDocument,
  ) {
    return this.emergencyRequestService.updateMyTripStatus(user, dto.status);
  }
}
