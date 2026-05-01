import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { UserRole } from '../constants/enums';
import type { UserDocument } from '../users/entities/user.entity';
import { RoutesService } from './routes.service';

@Controller('routes')
@UseGuards(AuthGuard, RolesGuard)
export class RoutesController {
  constructor(private readonly routesService: RoutesService) {}

  @Get('ambulance/:ambulanceId/request/:requestId')
  @Roles(UserRole.ADMIN, UserRole.DISPATCHER, UserRole.DRIVER)
  getAmbulanceToRequestRoute(
    @Param('ambulanceId') ambulanceId: string,
    @Param('requestId') requestId: string,
    @CurrentUser() user: UserDocument,
  ) {
    return this.routesService.getAmbulanceToRequestRoute(
      ambulanceId,
      requestId,
      user,
    );
  }

  @Get('request/:requestId/hospital')
  @Roles(UserRole.ADMIN, UserRole.DISPATCHER, UserRole.DRIVER, UserRole.PATIENT)
  getRequestToHospitalRoute(
    @Param('requestId') requestId: string,
    @CurrentUser() user: UserDocument,
  ) {
    return this.routesService.getRequestToHospitalRoute(requestId, user);
  }

  @Get('request/:requestId/full')
  @Roles(UserRole.ADMIN, UserRole.DISPATCHER, UserRole.DRIVER, UserRole.PATIENT)
  getFullRequestRoute(
    @Param('requestId') requestId: string,
    @CurrentUser() user: UserDocument,
  ) {
    return this.routesService.getFullRequestRoute(requestId, user);
  }
}
