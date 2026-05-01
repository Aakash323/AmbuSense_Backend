import {
  ForbiddenException,
  Inject,
  UnauthorizedException,
  forwardRef,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import type { Request } from 'express';
import { Types } from 'mongoose';
import { Server, Socket } from 'socket.io';
import { AmbulanceService } from '../ambulance/ambulance.service';
import { AmbulanceDocument } from '../ambulance/entities/ambulance.entity';
import { AuthService } from '../auth/auth.service';
import { UserRole } from '../constants/enums';
import { EmergencyRequestDocument } from '../emergency-request/entities/emergency-request.entity';
import { RoleProfilesService } from '../role-profiles/role-profiles.service';
import { UserDocument } from '../users/entities/user.entity';

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
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
    private readonly roleProfilesService: RoleProfilesService,
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
      const user = await this.authenticateLocationSender(client);
      await this.assertCanUpdateAmbulanceLocation(user, payload.ambulanceId);

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

  private async authenticateLocationSender(client: Socket) {
    if (this.isSystemSocket(client)) {
      return null;
    }

    try {
      return await this.authService.getCurrentUser({
        headers: client.handshake.headers,
      } as Request);
    } catch {
      throw new UnauthorizedException('Socket authentication required');
    }
  }

  private isSystemSocket(client: Socket) {
    const expectedToken = this.configService.get<string>('SOCKET_SYSTEM_TOKEN');

    if (!expectedToken) {
      return false;
    }

    const authToken = client.handshake.auth?.systemToken;
    const headerToken = client.handshake.headers['x-system-token'];
    const token = Array.isArray(headerToken) ? headerToken[0] : headerToken;

    return authToken === expectedToken || token === expectedToken;
  }

  private async assertCanUpdateAmbulanceLocation(
    user: UserDocument | null,
    ambulanceId: string,
  ) {
    if (!user || user.role === UserRole.ADMIN) {
      return;
    }

    if (user.role !== UserRole.DRIVER) {
      throw new ForbiddenException(
        'Only drivers can update ambulance location',
      );
    }

    await this.roleProfilesService.assertDriverVerified(
      user._id as Types.ObjectId,
    );

    const ambulance = await this.ambulanceService.findOne(ambulanceId);

    if (ambulance.phone !== user.phone || !ambulance.isActive) {
      throw new ForbiddenException('Cannot update another driver ambulance');
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

  emitEmergencyRequestCreated(request: EmergencyRequestDocument) {
    console.log('[socket] emitting emergency.request.created:', request.id);
    this.server.emit('emergency.request.created', request);
  }

  emitEmergencyRequestUpdated(request: EmergencyRequestDocument) {
    console.log('[socket] emitting emergency.request.updated:', request.id);
    this.server.emit('emergency.request.updated', request);
  }

  emitEmergencyRequestDispatched(request: EmergencyRequestDocument) {
    console.log('[socket] emitting emergency.request.dispatched:', request.id);
    this.server.emit('emergency.request.dispatched', request);
  }

  emitEmergencyRequestCancelled(request: EmergencyRequestDocument) {
    console.log('[socket] emitting emergency.request.cancelled:', request.id);
    this.server.emit('emergency.request.cancelled', request);
  }

  emitEmergencyRequestDeleted(payload: { id: string }) {
    console.log('[socket] emitting emergency.request.deleted:', payload.id);
    this.server.emit('emergency.request.deleted', payload);
  }
}
