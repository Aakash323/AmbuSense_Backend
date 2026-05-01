import { Body, Controller, Param, Patch, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { UserRole } from '../constants/enums';
import { RoleProfilesService } from '../role-profiles/role-profiles.service';
import { VerifyDriverDto } from './dto/verify-driver.dto';

@Controller('drivers')
@UseGuards(AuthGuard, RolesGuard)
export class DriversController {
  constructor(private readonly roleProfilesService: RoleProfilesService) {}

  @Patch(':id/verify')
  @Roles(UserRole.ADMIN)
  verify(@Param('id') id: string, @Body() dto: VerifyDriverDto) {
    return this.roleProfilesService.verifyDriver(
      id,
      dto.isVerified,
      dto.verificationNote,
    );
  }
}
