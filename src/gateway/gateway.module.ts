import { Module, forwardRef } from '@nestjs/common';
import { TrackingGateway } from './tracking.gateway';
import { AmbulanceModule } from '../ambulance/ambulance.module';

@Module({
  imports: [forwardRef(() => AmbulanceModule)],
  providers: [TrackingGateway],
  exports: [TrackingGateway],
})
export class GatewayModule {}
