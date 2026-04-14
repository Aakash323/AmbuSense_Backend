import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AmbulanceController } from './ambulance.controller';
import { AmbulanceService } from './ambulance.service';
import { Ambulance, AmbulanceSchema } from './entities/ambulance.entity';
import { GatewayModule } from '../gateway/gateway.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Ambulance.name, schema: AmbulanceSchema },
    ]),
    forwardRef(() => GatewayModule),
  ],
  controllers: [AmbulanceController],
  providers: [AmbulanceService],
  exports: [AmbulanceService],
})
export class AmbulanceModule {}
