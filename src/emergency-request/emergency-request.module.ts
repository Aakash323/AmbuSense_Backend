import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  EmergencyRequest,
  EmergencyRequestSchema,
} from './entities/emergency-request.entity';
import { EmergencyRequestController } from './emergency-request.controller';
import { EmergencyRequestService } from './emergency-request.service';
import { Ambulance, AmbulanceSchema } from '../ambulance/entities/ambulance.entity';
import { Hospital, HospitalSchema } from '../hospital/entities/hospital.entity';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: EmergencyRequest.name,
        schema: EmergencyRequestSchema,
      },
      {
        name: Ambulance.name,
        schema: AmbulanceSchema,
      },
      {
        name: Hospital.name,
        schema: HospitalSchema,
      },
    ]),
  ],
  controllers: [EmergencyRequestController],
  providers: [EmergencyRequestService],
  exports: [EmergencyRequestService],
})
export class EmergencyRequestModule {}
