import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { EmergencyRequestService } from './emergency-request.service';
import { CreateEmergencyRequestDto } from './dto/create-emergency-request.dto';
import { UpdateEmergencyRequestDto } from './dto/update-emergency-request.dto';
import { UpdateStatusDto } from './dto/update-status.dto';
import { AssignEmergencyRequestDto } from './dto/assign-emergency-request.dto';

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
  findAll() {
    return this.emergencyRequestService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.emergencyRequestService.findOne(id);
  }

  @Patch(':id/assign')
assign(@Param('id') id: string, @Body() dto: AssignEmergencyRequestDto) {
  return this.emergencyRequestService.assign(id, dto);
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
