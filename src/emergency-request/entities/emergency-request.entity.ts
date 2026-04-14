import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { EmergencyRequestStatus } from '../../constants/enums';

export type EmergencyRequestDocument = HydratedDocument<EmergencyRequest>;

@Schema({ timestamps: true })
export class EmergencyRequest {
  @Prop({ required: true, trim: true })
  patientName!: string;

  @Prop({ required: true, trim: true })
  patientPhone!: string;

  @Prop({
    type: {
      type: String,
      enum: ['Point'],
      required: true,
      default: 'Point',
    },
    coordinates: {
      type: [Number],
      required: true,
    },
  })
  pickupLocation!: {
    type: 'Point';
    coordinates: [number, number];
  };

  @Prop({
    type: Types.ObjectId,
    ref: 'Ambulance',
    default: null,
  })
  assignedAmbulance?: Types.ObjectId | null;

  @Prop({
    type: Types.ObjectId,
    ref: 'Hospital',
    default: null,
  })
  assignedHospital?: Types.ObjectId | null;

  @Prop({
    required: true,
    enum: Object.values(EmergencyRequestStatus),
    default: EmergencyRequestStatus.PENDING,
  })
  status!: EmergencyRequestStatus;

  @Prop({ default: '' })
  notes?: string;

  @Prop({ type: Date, default: null })
  assignedAt?: Date | null;

  @Prop({ type: Date, default: null })
  reachedPatientAt?: Date | null;

  @Prop({ type: Date, default: null })
  completedAt?: Date | null;

  createdAt?: Date;
  updatedAt?: Date;
}

export const EmergencyRequestSchema =
  SchemaFactory.createForClass(EmergencyRequest);

EmergencyRequestSchema.index({ pickupLocation: '2dsphere' });