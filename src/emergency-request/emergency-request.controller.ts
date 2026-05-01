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
import { EmergencyRequestService } from './emergency-request.service';
import { CreateEmergencyRequestDto } from './dto/create-emergency-request.dto';
import { UpdateEmergencyRequestDto } from './dto/update-emergency-request.dto';
import { UpdateStatusDto } from './dto/update-status.dto';
import { AssignEmergencyRequestDto } from './dto/assign-emergency-request.dto';
import { DispatchEmergencyRequestDto } from './dto/dispatch-emergency-request.dto';
import { CancelEmergencyRequestDto } from './dto/cancel-emergency-request.dto';
import { FindEmergencyRequestsQueryDto } from './dto/find-emergency-requests-query.dto';

@Controller('emergency-requests')
@UseGuards(AuthGuard, RolesGuard)
export class EmergencyRequestController {
  constructor(
    private readonly emergencyRequestService: EmergencyRequestService,
  ) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.DISPATCHER, UserRole.PATIENT)
  create(
    @Body() dto: CreateEmergencyRequestDto,
    @CurrentUser() user: UserDocument,
  ) {
    return this.emergencyRequestService.create(dto, user);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.DISPATCHER, UserRole.DRIVER)
  findAll(
    @Query() query: FindEmergencyRequestsQueryDto,
    @CurrentUser() user: UserDocument,
  ) {
    return this.emergencyRequestService.findAll(query, user);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.DISPATCHER, UserRole.DRIVER, UserRole.PATIENT)
  findOne(@Param('id') id: string, @CurrentUser() user: UserDocument) {
    return this.emergencyRequestService.findOne(id, user);
  }

  @Patch(':id/assign')
  @Roles(UserRole.ADMIN, UserRole.DISPATCHER)
  assign(@Param('id') id: string, @Body() dto: AssignEmergencyRequestDto) {
    return this.emergencyRequestService.assign(id, dto);
  }

  @Patch(':id/dispatch')
  @Roles(UserRole.ADMIN, UserRole.DISPATCHER)
  dispatch(@Param('id') id: string, @Body() dto: DispatchEmergencyRequestDto) {
    return this.emergencyRequestService.dispatch(id, dto);
  }

  @Patch(':id/cancel')
  @Roles(UserRole.ADMIN, UserRole.DISPATCHER, UserRole.PATIENT)
  cancel(
    @Param('id') id: string,
    @Body() dto: CancelEmergencyRequestDto,
    @CurrentUser() user: UserDocument,
  ) {
    return this.emergencyRequestService.cancel(id, dto, user);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.DISPATCHER)
  update(@Param('id') id: string, @Body() dto: UpdateEmergencyRequestDto) {
    return this.emergencyRequestService.update(id, dto);
  }

  @Patch(':id/status')
  @Roles(UserRole.ADMIN, UserRole.DISPATCHER, UserRole.DRIVER)
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateStatusDto,
    @CurrentUser() user: UserDocument,
  ) {
    return this.emergencyRequestService.updateStatus(id, dto.status, user);
  }
  @Delete(':id')
  @Roles(UserRole.ADMIN)
  remove(@Param('id') id: string) {
    return this.emergencyRequestService.remove(id);
  }
}
