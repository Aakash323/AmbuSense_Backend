import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { UserRole } from '../constants/enums';
import type { UserDocument } from '../users/entities/user.entity';
import { AmbulanceService } from './ambulance.service';
import { CreateAmbulanceDto } from './dto/create-ambulance.dto';
import { UpdateAmbulanceDto } from './dto/update-ambulance.dto';
import { UpdateAmbulanceStatusDto } from './dto/update-ambulance-status.dto';
import { FindAmbulancesQueryDto } from './dto/find-ambulances-query.dto';

@Controller('ambulances')
@UseGuards(AuthGuard, RolesGuard)
export class AmbulanceController {
  constructor(private readonly ambulanceService: AmbulanceService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.DISPATCHER)
  create(@Body() dto: CreateAmbulanceDto) {
    return this.ambulanceService.create(dto);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.DISPATCHER, UserRole.DRIVER)
  findAll(@Query() query: FindAmbulancesQueryDto) {
    return this.ambulanceService.findAll(query);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.DISPATCHER, UserRole.DRIVER)
  findOne(@Param('id') id: string) {
    return this.ambulanceService.findOne(id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.DISPATCHER)
  update(@Param('id') id: string, @Body() dto: UpdateAmbulanceDto) {
    return this.ambulanceService.update(id, dto);
  }

  @Patch(':id/status')
  @Roles(UserRole.ADMIN, UserRole.DISPATCHER, UserRole.DRIVER)
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateAmbulanceStatusDto,
    @CurrentUser() user: UserDocument,
  ) {
    return this.ambulanceService.updateStatus(id, dto, user);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  remove(@Param('id') id: string) {
    return this.ambulanceService.remove(id);
  }
}
