import { Inject, forwardRef } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { AmbulanceService } from '../ambulance/ambulance.service';
import { AmbulanceDocument } from '../ambulance/entities/ambulance.entity';

@WebSocketGateway({
  cors: {
    origin: 'http://localhost:3000',
    credentials: true,
  },
})
export class TrackingGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server!: Server;

  constructor(
    @Inject(forwardRef(() => AmbulanceService))
    private readonly ambulanceService: AmbulanceService,
  ) {}

  handleConnection(client: Socket) {
    console.log(`[socket] connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`[socket] disconnected: ${client.id}`);
  }

  @SubscribeMessage('ambulance.location.send')
  async handleAmbulanceLocationSend(
    @MessageBody()
    payload: {
      ambulanceId: string;
      coordinates: [number, number];
      accuracy?: number;
      timestamp?: string;
    },
    @ConnectedSocket() client: Socket,
  ) {
    console.log(
      `[server] received ambulance.location.send from ${client.id}:`,
      payload,
    );

    try {
      // 🔹 1. Get current ambulance from DB
      const current = await this.ambulanceService.findOne(payload.ambulanceId);

      const [oldLng, oldLat] = current.currentLocation.coordinates;
      const [newLng, newLat] = payload.coordinates;

      // 🔹 2. Check if location is same
      const sameLocation = oldLng === newLng && oldLat === newLat;

      if (sameLocation) {
        console.log('[server] skipped update: same coordinates');
        return { ok: true, skipped: true };
      }

      // 🔹 3. Update database
      const updated = await this.ambulanceService.update(payload.ambulanceId, {
        coordinates: payload.coordinates,
      });

      // 🔹 4. Prepare outgoing event
      const outgoing = {
        id: updated.id,
        currentLocation: updated.currentLocation,
        status: updated.status,
        accuracy: payload.accuracy,
        timestamp: payload.timestamp,
      };

      // 🔹 5. Emit to all clients
      console.log('[server] emitting ambulance.location.updated:', outgoing);
      this.server.emit('ambulance.location.updated', outgoing);

      return { ok: true };
    } catch (error) {
      console.error('[server] error handling location:', error);
      return { ok: false, error: 'failed to update location' };
    }
  }

  emitAmbulanceUpdated(ambulance: AmbulanceDocument) {
    this.server.emit('ambulance.updated', ambulance);
  }

  emitAmbulanceLocationUpdated(payload: {
    id: string;
    currentLocation: {
      type: 'Point';
      coordinates: [number, number];
    };
    status: string;
    updatedAt: Date;
  }) {
    this.server.emit('ambulance.location.updated', payload);
  }

  emitAmbulanceStatusUpdated(payload: {
    id: string;
    status: string;
    assignedAt: Date | null;
    reachedPatientAt: Date | null;
    transportStartedAt: Date | null;
    reachedHospitalAt: Date | null;
    completedAt: Date | null;
    updatedAt: Date;
  }) {
    this.server.emit('ambulance.status.updated', payload);
  }
}
