import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { isValidObjectId, Model, Types } from 'mongoose';
import { CreateEmergencyRequestDto } from './dto/create-emergency-request.dto';
import { UpdateEmergencyRequestDto } from './dto/update-emergency-request.dto';
import {
  EmergencyRequest,
  EmergencyRequestDocument,
} from './entities/emergency-request.entity';
import {
  Ambulance,
  AmbulanceDocument,
} from '../ambulance/entities/ambulance.entity';
import { AmbulanceStatus, EmergencyRequestStatus } from '../constants/enums';
import { AssignEmergencyRequestDto } from './dto/assign-emergency-request.dto';

@Injectable()
export class EmergencyRequestService {
  private readonly ALLOWED_STATUS_TRANSITIONS: Record<
    EmergencyRequestStatus,
    EmergencyRequestStatus[]
  > = {
    [EmergencyRequestStatus.PENDING]: [EmergencyRequestStatus.ASSIGNED],
    [EmergencyRequestStatus.ASSIGNED]: [EmergencyRequestStatus.EN_ROUTE],
    [EmergencyRequestStatus.EN_ROUTE]: [EmergencyRequestStatus.AT_PATIENT],
    [EmergencyRequestStatus.AT_PATIENT]: [EmergencyRequestStatus.TRANSPORTING],
    [EmergencyRequestStatus.TRANSPORTING]: [EmergencyRequestStatus.AT_HOSPITAL],
    [EmergencyRequestStatus.AT_HOSPITAL]: [EmergencyRequestStatus.COMPLETED],
    [EmergencyRequestStatus.COMPLETED]: [EmergencyRequestStatus.PENDING],
  };

  constructor(
    @InjectModel(EmergencyRequest.name)
    private readonly emergencyRequestModel: Model<EmergencyRequestDocument>,
    @InjectModel(Ambulance.name)
    private readonly ambulanceModel: Model<AmbulanceDocument>,
  ) {}

  async create(createDto: CreateEmergencyRequestDto) {
    const { coordinates, assignedHospital, ...rest } = createDto;

    const nearestAmbulance =
      await this.findNearestAvailableAmbulance(coordinates);

    const requestData: Partial<EmergencyRequest> & {
      pickupLocation: { type: 'Point'; coordinates: [number, number] };
    } = {
      ...rest,
      pickupLocation: {
        type: 'Point',
        coordinates,
      },
      status: EmergencyRequestStatus.PENDING,
      assignedAmbulance: null,
      assignedHospital: assignedHospital
        ? new Types.ObjectId(assignedHospital)
        : null,
      assignedAt: null,
      reachedPatientAt: null,
      completedAt: null,
    };

    if (nearestAmbulance) {
      requestData.assignedAmbulance = nearestAmbulance._id as Types.ObjectId;
      requestData.status = EmergencyRequestStatus.ASSIGNED;
      requestData.assignedAt = new Date();

      nearestAmbulance.status = AmbulanceStatus.ASSIGNED;
      nearestAmbulance.assignedAt = new Date();
      await nearestAmbulance.save();
    }

    const created = await this.emergencyRequestModel.create(requestData);

    return this.findOne(created.id);
  }

  async findAll() {
    return this.emergencyRequestModel
      .find()
      .populate('assignedAmbulance')
      .populate('assignedHospital')
      .sort({ createdAt: -1 });
  }

  async findOne(id: string) {
    const request = await this.emergencyRequestModel
      .findById(id)
      .populate('assignedAmbulance')
      .populate('assignedHospital');

    if (!request) {
      throw new NotFoundException('Emergency request not found');
    }

    return request;
  }

  async update(id: string, dto: UpdateEmergencyRequestDto) {
    const request = await this.emergencyRequestModel.findById(id);

    if (!request) {
      throw new NotFoundException('Emergency request not found');
    }

    if (dto.patientName !== undefined) {
      request.patientName = dto.patientName;
    }

    if (dto.patientPhone !== undefined) {
      request.patientPhone = dto.patientPhone;
    }

    if (dto.coordinates) {
      request.pickupLocation = {
        type: 'Point',
        coordinates: dto.coordinates,
      };
    }

    if (dto.assignedHospital !== undefined) {
      request.assignedHospital = dto.assignedHospital
        ? new Types.ObjectId(dto.assignedHospital)
        : null;
    }

    if (dto.notes !== undefined) {
      request.notes = dto.notes;
    }

    const updated = await request.save();

    return this.findOne(updated.id);
  }

  async assign(id: string, dto: AssignEmergencyRequestDto) {
    const request = await this.emergencyRequestModel.findById(id);

    if (!request) {
      throw new NotFoundException('Emergency request not found');
    }

    let ambulance: AmbulanceDocument | null = null;

    if (dto.ambulanceId) {
      if (!isValidObjectId(dto.ambulanceId)) {
        throw new BadRequestException('Invalid ambulance id');
      }

      ambulance = await this.ambulanceModel.findById(dto.ambulanceId);

      if (!ambulance) {
        throw new NotFoundException('Ambulance not found');
      }

      if (ambulance.status !== AmbulanceStatus.AVAILABLE) {
        throw new BadRequestException('Selected ambulance is not available');
      }
    } else {
      ambulance = await this.findNearestAvailableAmbulance(
        request.pickupLocation.coordinates,
      );

      if (!ambulance) {
        throw new NotFoundException('No available ambulance found');
      }
    }

    if (request.assignedAmbulance) {
      const previousAmbulance = await this.ambulanceModel.findById(
        request.assignedAmbulance,
      );

      if (previousAmbulance && previousAmbulance.id !== ambulance.id) {
        previousAmbulance.status = AmbulanceStatus.AVAILABLE;
        previousAmbulance.assignedAt = null;
        previousAmbulance.reachedPatientAt = null;
        previousAmbulance.transportStartedAt = null;
        previousAmbulance.reachedHospitalAt = null;
        previousAmbulance.completedAt = null;
        await previousAmbulance.save();
      }
    }

    request.assignedAmbulance = ambulance._id as Types.ObjectId;
    request.status = EmergencyRequestStatus.ASSIGNED;
    request.assignedAt = new Date();

    if (dto.hospitalId !== undefined) {
      request.assignedHospital = dto.hospitalId
        ? new Types.ObjectId(dto.hospitalId)
        : null;
    }

    if (dto.notes !== undefined) {
      request.notes = dto.notes;
    }

    ambulance.status = AmbulanceStatus.ASSIGNED;
    ambulance.assignedAt = new Date();
    await ambulance.save();

    await request.save();

    return this.findOne(request.id);
  }

  async updateStatus(id: string, newStatus: EmergencyRequestStatus) {
    const request = await this.emergencyRequestModel.findById(id);

    if (!request) {
      throw new NotFoundException('Emergency request not found');
    }

    const currentStatus = request.status;
    const allowedNext = this.ALLOWED_STATUS_TRANSITIONS[currentStatus] || [];

    if (!allowedNext.includes(newStatus)) {
      throw new BadRequestException(
        `Invalid status transition from '${currentStatus}' to '${newStatus}'`,
      );
    }

    request.status = newStatus;

    if (newStatus === EmergencyRequestStatus.ASSIGNED) {
      request.assignedAt = new Date();
    }

    if (newStatus === EmergencyRequestStatus.AT_PATIENT) {
      request.reachedPatientAt = new Date();
    }

    if (newStatus === EmergencyRequestStatus.COMPLETED) {
      request.completedAt = new Date();
    }

    await this.syncAssignedAmbulanceStatus(request, newStatus);

    await request.save();

    return this.findOne(request.id);
  }

  async remove(id: string) {
    const request = await this.emergencyRequestModel.findById(id);

    if (!request) {
      throw new NotFoundException('Emergency request not found');
    }

    if (request.assignedAmbulance) {
      const ambulance = await this.ambulanceModel.findById(
        request.assignedAmbulance,
      );

      if (ambulance) {
        ambulance.status = AmbulanceStatus.AVAILABLE;
        ambulance.assignedAt = null;
        ambulance.reachedPatientAt = null;
        ambulance.transportStartedAt = null;
        ambulance.reachedHospitalAt = null;
        ambulance.completedAt = null;
        await ambulance.save();
      }
    }

    await this.emergencyRequestModel.findByIdAndDelete(id);

    return { message: 'Emergency request deleted successfully' };
  }

  private async findNearestAvailableAmbulance(
    coordinates: [number, number],
  ): Promise<AmbulanceDocument | null> {
    return this.ambulanceModel.findOne({
      isActive: true,
      status: AmbulanceStatus.AVAILABLE,
      currentLocation: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates,
          },
        },
      },
    });
  }

  private async syncAssignedAmbulanceStatus(
    request: EmergencyRequestDocument,
    requestStatus: EmergencyRequestStatus,
  ) {
    if (!request.assignedAmbulance) {
      return;
    }

    const ambulance = await this.ambulanceModel.findById(
      request.assignedAmbulance,
    );

    if (!ambulance) {
      return;
    }

    if (requestStatus === EmergencyRequestStatus.ASSIGNED) {
      ambulance.status = AmbulanceStatus.ASSIGNED;
      ambulance.assignedAt = request.assignedAt ?? new Date();
    }

    if (requestStatus === EmergencyRequestStatus.EN_ROUTE) {
      ambulance.status = AmbulanceStatus.EN_ROUTE;
    }

    if (requestStatus === EmergencyRequestStatus.AT_PATIENT) {
      ambulance.status = AmbulanceStatus.AT_PATIENT;
      ambulance.reachedPatientAt = request.reachedPatientAt ?? new Date();
    }

    if (requestStatus === EmergencyRequestStatus.TRANSPORTING) {
      ambulance.status = AmbulanceStatus.TRANSPORTING;
      ambulance.transportStartedAt = new Date();
    }

    if (requestStatus === EmergencyRequestStatus.AT_HOSPITAL) {
      ambulance.status = AmbulanceStatus.AT_HOSPITAL;
      ambulance.reachedHospitalAt = new Date();
    }

    if (requestStatus === EmergencyRequestStatus.COMPLETED) {
      ambulance.status = AmbulanceStatus.COMPLETED;
      ambulance.completedAt = request.completedAt ?? new Date();
    }

    if (requestStatus === EmergencyRequestStatus.PENDING) {
      ambulance.status = AmbulanceStatus.AVAILABLE;
      ambulance.assignedAt = null;
      ambulance.reachedPatientAt = null;
      ambulance.transportStartedAt = null;
      ambulance.reachedHospitalAt = null;
      ambulance.completedAt = null;
    }

    await ambulance.save();
  }
}