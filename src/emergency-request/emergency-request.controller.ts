import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { EmergencyRequestService } from './emergency-request.service';
import { CreateEmergencyRequestDto } from './dto/create-emergency-request.dto';
import { UpdateEmergencyRequestDto } from './dto/update-emergency-request.dto';
import { UpdateStatusDto } from './dto/update-status.dto';
import { AssignEmergencyRequestDto } from './dto/assign-emergency-request.dto';
import { DispatchEmergencyRequestDto } from './dto/dispatch-emergency-request.dto';
import { CancelEmergencyRequestDto } from './dto/cancel-emergency-request.dto';
import { FindEmergencyRequestsQueryDto } from './dto/find-emergency-requests-query.dto';

@Controller('emergency-requests')
export class EmergencyRequestController {
  constructor(
    private readonly emergencyRequestService: EmergencyRequestService,
  ) {}

  @Post()
  create(@Body() dto: CreateEmergencyRequestDto) {
    return this.emergencyRequestService.create(dto);
  }

  @Get()
  findAll(@Query() query: FindEmergencyRequestsQueryDto) {
    return this.emergencyRequestService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.emergencyRequestService.findOne(id);
  }

  @Patch(':id/assign')
  assign(@Param('id') id: string, @Body() dto: AssignEmergencyRequestDto) {
    return this.emergencyRequestService.assign(id, dto);
  }

  @Patch(':id/dispatch')
  dispatch(
    @Param('id') id: string,
    @Body() dto: DispatchEmergencyRequestDto,
  ) {
    return this.emergencyRequestService.dispatch(id, dto);
  }

  @Patch(':id/cancel')
  cancel(
    @Param('id') id: string,
    @Body() dto: CancelEmergencyRequestDto,
  ) {
    return this.emergencyRequestService.cancel(id, dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateEmergencyRequestDto) {
    return this.emergencyRequestService.update(id, dto);
  }

  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @Body() dto: UpdateStatusDto) {
    return this.emergencyRequestService.updateStatus(id, dto.status);
  }
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.emergencyRequestService.remove(id);
  }
}
