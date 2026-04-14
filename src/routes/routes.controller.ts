import { Controller, Get, Param } from '@nestjs/common';
import { RoutesService } from './routes.service';

@Controller('routes')
export class RoutesController {
  constructor(private readonly routesService: RoutesService) {}

  @Get('ambulance/:ambulanceId/request/:requestId')
  getAmbulanceToRequestRoute(
    @Param('ambulanceId') ambulanceId: string,
    @Param('requestId') requestId: string,
  ) {
    return this.routesService.getAmbulanceToRequestRoute(
      ambulanceId,
      requestId,
    );
  }

  @Get('request/:requestId/hospital')
  getRequestToHospitalRoute(@Param('requestId') requestId: string) {
    return this.routesService.getRequestToHospitalRoute(requestId);
  }

  @Get('request/:requestId/full')
  getFullRequestRoute(@Param('requestId') requestId: string) {
    return this.routesService.getFullRequestRoute(requestId);
  }
}
