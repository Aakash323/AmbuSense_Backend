import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBody,
  ApiCookieAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AuthGuard } from '../auth/auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { UserRole } from '../constants/enums';
import { RoleProfilesService } from '../role-profiles/role-profiles.service';
import { FindDriversQueryDto } from './dto/find-drivers-query.dto';
import { VerifyDriverDto } from './dto/verify-driver.dto';
import { driverProfileExample } from '../swagger/api-examples';

@ApiTags('Drivers')
@ApiCookieAuth('session')
@Controller('drivers')
@UseGuards(AuthGuard, RolesGuard)
export class DriversController {
  constructor(private readonly roleProfilesService: RoleProfilesService) {}

  @Get()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'List driver profiles' })
  @ApiQuery({ name: 'isVerified', required: false, example: true })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 10 })
  findAll(@Query() query: FindDriversQueryDto) {
    return this.roleProfilesService.findDrivers(query);
  }

  @Patch(':id/verify')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Verify or reject a driver profile' })
  @ApiParam({ name: 'id', example: driverProfileExample.id })
  @ApiBody({ type: VerifyDriverDto })
  @ApiResponse({
    status: 200,
    description: 'Updated driver verification profile.',
    schema: {
      example: {
        ...driverProfileExample,
        isVerified: true,
        verificationNote: 'License verified by admin',
      },
    },
  })
  @ApiResponse({ status: 403, description: 'Admin role required.' })
  verify(@Param('id') id: string, @Body() dto: VerifyDriverDto) {
    return this.roleProfilesService.verifyDriver(
      id,
      dto.isVerified,
      dto.verificationNote,
    );
  }
}
