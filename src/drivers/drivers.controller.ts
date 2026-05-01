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
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AuthGuard } from '../auth/auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { UserRole } from '../constants/enums';
import { RoleProfilesService } from '../role-profiles/role-profiles.service';
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
  findAll(@Query('isVerified') isVerified?: string) {
    const verifiedFilter =
      isVerified === undefined ? undefined : isVerified === 'true';

    return this.roleProfilesService.findDrivers(verifiedFilter);
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
