import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  EmergencyRequest,
  EmergencyRequestSchema,
} from './entities/emergency-request.entity';
import { EmergencyRequestController } from './emergency-request.controller';
import { EmergencyRequestService } from './emergency-request.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: EmergencyRequest.name,
        schema: EmergencyRequestSchema,
      },
    ]),
  ],
  controllers: [EmergencyRequestController],
  providers: [EmergencyRequestService],
  exports: [EmergencyRequestService],
})
export class EmergencyRequestModule {}
