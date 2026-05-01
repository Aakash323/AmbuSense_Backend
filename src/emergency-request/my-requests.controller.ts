import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { UserRole } from '../constants/enums';
import type { UserDocument } from '../users/entities/user.entity';
import { CancelEmergencyRequestDto } from './dto/cancel-emergency-request.dto';
import { EmergencyRequestService } from './emergency-request.service';

@Controller('my/requests')
@UseGuards(AuthGuard, RolesGuard)
@Roles(UserRole.PATIENT)
export class MyRequestsController {
  constructor(
    private readonly emergencyRequestService: EmergencyRequestService,
  ) {}

  @Get()
  findAll(@CurrentUser() user: UserDocument) {
    return this.emergencyRequestService.findMyRequests(user);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: UserDocument) {
    return this.emergencyRequestService.findMyRequest(id, user);
  }

  @Patch(':id/cancel')
  cancel(
    @Param('id') id: string,
    @Body() dto: CancelEmergencyRequestDto,
    @CurrentUser() user: UserDocument,
  ) {
    return this.emergencyRequestService.cancelMyRequest(id, dto, user);
  }
}
