import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { AmbulanceService } from './ambulance.service';
import { CreateAmbulanceDto } from './dto/create-ambulance.dto';
import { UpdateAmbulanceDto } from './dto/update-ambulance.dto';
import { UpdateAmbulanceStatusDto } from './dto/update-ambulance-status.dto';

@Controller('ambulances')
export class AmbulanceController {
  constructor(private readonly ambulanceService: AmbulanceService) {}

  @Post()
  create(@Body() dto: CreateAmbulanceDto) {
    return this.ambulanceService.create(dto);
  }

  @Get()
  findAll() {
    return this.ambulanceService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.ambulanceService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateAmbulanceDto) {
    return this.ambulanceService.update(id, dto);
  }

  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @Body() dto: UpdateAmbulanceStatusDto) {
    return this.ambulanceService.updateStatus(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.ambulanceService.remove(id);
  }
}
