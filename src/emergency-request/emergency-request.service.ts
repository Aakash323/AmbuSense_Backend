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
import {
  AmbulanceStatus,
  EmergencyRequestStatus,
  HospitalAssignmentTechnique,
} from '../constants/enums';
import { AssignEmergencyRequestDto } from './dto/assign-emergency-request.dto';
import {
  Hospital,
  HospitalDocument,
} from '../hospital/entities/hospital.entity';
import { DispatchEmergencyRequestDto } from './dto/dispatch-emergency-request.dto';
import { CancelEmergencyRequestDto } from './dto/cancel-emergency-request.dto';
import { FindEmergencyRequestsQueryDto } from './dto/find-emergency-requests-query.dto';

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
    [EmergencyRequestStatus.CANCELLED]: [],
  };

  constructor(
    @InjectModel(EmergencyRequest.name)
    private readonly emergencyRequestModel: Model<EmergencyRequestDocument>,
    @InjectModel(Ambulance.name)
    private readonly ambulanceModel: Model<AmbulanceDocument>,
    @InjectModel(Hospital.name)
    private readonly hospitalModel: Model<HospitalDocument>,
  ) {}

  async create(createDto: CreateEmergencyRequestDto) {
    const { coordinates, assignedHospital, ...rest } = createDto;

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
      assignedHospital: null,
      assignedAt: null,
      reachedPatientAt: null,
      completedAt: null,
      cancelledAt: null,
      cancellationReason: '',
    };

    if (assignedHospital) {
      const hospital = await this.findValidHospitalById(assignedHospital);
      requestData.assignedHospital = hospital._id as Types.ObjectId;
      requestData.hospitalAssignmentTechnique =
        HospitalAssignmentTechnique.USER_CHOICE;
    }

    const assignedAt = new Date();
    const nearestAmbulance = await this.claimNearestAvailableAmbulance(
      coordinates,
      assignedAt,
    );

    if (nearestAmbulance) {
      requestData.assignedAmbulance = nearestAmbulance._id as Types.ObjectId;
      requestData.status = EmergencyRequestStatus.ASSIGNED;
      requestData.assignedAt = assignedAt;

      if (!requestData.assignedHospital) {
        const nearestHospital =
          await this.findNearestValidHospital(coordinates);

        if (!nearestHospital) {
          await this.releaseAmbulance(nearestAmbulance._id as Types.ObjectId);
          throw new NotFoundException('No available hospital found');
        }

        requestData.assignedHospital = nearestHospital._id as Types.ObjectId;
        requestData.hospitalAssignmentTechnique =
          HospitalAssignmentTechnique.SYSTEM_AUTO;
      }
    }

    const created = await this.emergencyRequestModel.create(requestData);

    return this.findOne(created.id);
  }

  async findAll(query: FindEmergencyRequestsQueryDto = {}) {
    const filter: Record<string, unknown> = {};

    if (query.status) {
      filter.status = query.status;
    }

    if (query.assignedAmbulance) {
      filter.assignedAmbulance = new Types.ObjectId(query.assignedAmbulance);
    }

    if (query.assignedHospital) {
      filter.assignedHospital = new Types.ObjectId(query.assignedHospital);
    }

    if (query.hospitalAssignmentTechnique) {
      filter.hospitalAssignmentTechnique = query.hospitalAssignmentTechnique;
    }

    if (query.search) {
      const regex = new RegExp(this.escapeRegex(query.search), 'i');
      filter.$or = [
        { patientName: regex },
        { patientPhone: regex },
        { notes: regex },
        { cancellationReason: regex },
      ];
    }

    return this.emergencyRequestModel
      .find(filter)
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
      const hospital = await this.findValidHospitalById(dto.assignedHospital);
      request.assignedHospital = hospital._id as Types.ObjectId;
      request.hospitalAssignmentTechnique =
        HospitalAssignmentTechnique.USER_CHOICE;
    }

    if (dto.notes !== undefined) {
      request.notes = dto.notes;
    }

    const updated = await request.save();

    return this.findOne(updated.id);
  }

  async dispatch(id: string, dto: DispatchEmergencyRequestDto) {
    const request = await this.emergencyRequestModel.findById(id);

    if (!request) {
      throw new NotFoundException('Emergency request not found');
    }

    this.assertRequestNotDispatched(request);

    const hospital = await this.resolveHospitalForDispatch(
      dto,
      request.pickupLocation.coordinates,
    );

    const assignedAt = new Date();
    const ambulance = dto.ambulanceId
      ? await this.claimAvailableAmbulanceById(dto.ambulanceId, assignedAt)
      : await this.claimNearestAvailableAmbulance(
          request.pickupLocation.coordinates,
          assignedAt,
        );

    if (!ambulance) {
      throw new NotFoundException('No available ambulance found');
    }

    request.assignedAmbulance = ambulance._id as Types.ObjectId;
    request.assignedHospital = hospital._id as Types.ObjectId;
    request.hospitalAssignmentTechnique = dto.hospitalAssignmentTechnique;
    request.status = EmergencyRequestStatus.ASSIGNED;
    request.assignedAt = assignedAt;

    if (dto.notes !== undefined) {
      request.notes = dto.notes;
    }

    await request.save();

    return this.findOne(request.id);
  }

  async cancel(id: string, dto: CancelEmergencyRequestDto) {
    const request = await this.emergencyRequestModel.findById(id);

    if (!request) {
      throw new NotFoundException('Emergency request not found');
    }

    if (request.status === EmergencyRequestStatus.CANCELLED) {
      throw new BadRequestException('Emergency request is already cancelled');
    }

    if (request.status === EmergencyRequestStatus.COMPLETED) {
      throw new BadRequestException('Completed emergency request cannot be cancelled');
    }

    if (request.assignedAmbulance) {
      await this.releaseAmbulance(request.assignedAmbulance);
    }

    request.status = EmergencyRequestStatus.CANCELLED;
    request.cancelledAt = new Date();

    if (dto.reason !== undefined) {
      request.cancellationReason = dto.reason;
    }

    await request.save();

    return this.findOne(request.id);
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

      ambulance = await this.claimAvailableAmbulanceById(
        dto.ambulanceId,
        new Date(),
      );
    } else {
      ambulance = await this.claimNearestAvailableAmbulance(
        request.pickupLocation.coordinates,
        new Date(),
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
        await this.releaseAmbulance(previousAmbulance._id as Types.ObjectId);
      }
    }

    const assignedAt = ambulance.assignedAt ?? new Date();

    request.assignedAmbulance = ambulance._id as Types.ObjectId;
    request.status = EmergencyRequestStatus.ASSIGNED;
    request.assignedAt = assignedAt;

    if (dto.hospitalId !== undefined) {
      const hospital = await this.findValidHospitalById(dto.hospitalId);
      request.assignedHospital = hospital._id as Types.ObjectId;
      request.hospitalAssignmentTechnique =
        HospitalAssignmentTechnique.USER_CHOICE;
    }

    if (dto.notes !== undefined) {
      request.notes = dto.notes;
    }

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
        await this.releaseAmbulance(ambulance._id as Types.ObjectId);
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

  private escapeRegex(value: string) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  private async claimNearestAvailableAmbulance(
    coordinates: [number, number],
    assignedAt: Date,
  ): Promise<AmbulanceDocument | null> {
    const candidates = await this.ambulanceModel
      .find({
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
      })
      .limit(20);

    for (const candidate of candidates) {
      const claimed = await this.ambulanceModel.findOneAndUpdate(
        {
          _id: candidate._id,
          isActive: true,
          status: AmbulanceStatus.AVAILABLE,
        },
        {
          $set: {
            status: AmbulanceStatus.ASSIGNED,
            assignedAt,
          },
        },
        { new: true },
      );

      if (claimed) {
        return claimed;
      }
    }

    return null;
  }

  private async findAvailableAmbulanceById(
    ambulanceId: string,
  ): Promise<AmbulanceDocument> {
    if (!isValidObjectId(ambulanceId)) {
      throw new BadRequestException('Invalid ambulance id');
    }

    const ambulance = await this.ambulanceModel.findById(ambulanceId);

    if (!ambulance) {
      throw new NotFoundException('Ambulance not found');
    }

    if (
      !ambulance.isActive ||
      ambulance.status !== AmbulanceStatus.AVAILABLE
    ) {
      throw new BadRequestException('Selected ambulance is not available');
    }

    return ambulance;
  }

  private async claimAvailableAmbulanceById(
    ambulanceId: string,
    assignedAt: Date,
  ): Promise<AmbulanceDocument> {
    if (!isValidObjectId(ambulanceId)) {
      throw new BadRequestException('Invalid ambulance id');
    }

    const ambulance = await this.ambulanceModel.findById(ambulanceId);

    if (!ambulance) {
      throw new NotFoundException('Ambulance not found');
    }

    const claimed = await this.ambulanceModel.findOneAndUpdate(
      {
        _id: ambulance._id,
        isActive: true,
        status: AmbulanceStatus.AVAILABLE,
      },
      {
        $set: {
          status: AmbulanceStatus.ASSIGNED,
          assignedAt,
        },
      },
      { new: true },
    );

    if (!claimed) {
      throw new BadRequestException('Selected ambulance is not available');
    }

    return claimed;
  }

  private async releaseAmbulance(ambulanceId: Types.ObjectId) {
    const ambulance = await this.ambulanceModel.findById(ambulanceId);

    if (!ambulance) {
      return;
    }

    ambulance.status = AmbulanceStatus.AVAILABLE;
    ambulance.assignedAt = null;
    ambulance.reachedPatientAt = null;
    ambulance.transportStartedAt = null;
    ambulance.reachedHospitalAt = null;
    ambulance.completedAt = null;

    await ambulance.save();
  }

  private async findNearestValidHospital(
    coordinates: [number, number],
  ): Promise<HospitalDocument | null> {
    return this.hospitalModel.findOne({
      status: 'available',
      availableBeds: { $gt: 0 },
      location: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates,
          },
        },
      },
    });
  }

  private async findValidHospitalById(
    hospitalId: string,
  ): Promise<HospitalDocument> {
    if (!isValidObjectId(hospitalId)) {
      throw new BadRequestException('Invalid hospital id');
    }

    const hospital = await this.hospitalModel.findById(hospitalId);

    if (!hospital) {
      throw new NotFoundException('Hospital not found');
    }

    if (hospital.status !== 'available' || hospital.availableBeds <= 0) {
      throw new BadRequestException('Selected hospital is not available');
    }

    return hospital;
  }

  private assertRequestNotDispatched(request: EmergencyRequestDocument) {
    if (
      request.status !== EmergencyRequestStatus.PENDING ||
      request.assignedAmbulance ||
      request.assignedHospital
    ) {
      throw new BadRequestException('Emergency request is already dispatched');
    }
  }

  private async resolveHospitalForDispatch(
    dto: DispatchEmergencyRequestDto,
    coordinates: [number, number],
  ): Promise<HospitalDocument> {
    if (
      dto.hospitalAssignmentTechnique ===
      HospitalAssignmentTechnique.SYSTEM_AUTO
    ) {
      if (dto.hospitalId) {
        throw new BadRequestException(
          'hospitalId is not allowed for system-auto assignment',
        );
      }

      const hospital = await this.findNearestValidHospital(coordinates);

      if (!hospital) {
        throw new NotFoundException('No available hospital found');
      }

      return hospital;
    }

    if (!dto.hospitalId) {
      throw new BadRequestException('hospitalId is required');
    }

    return this.findValidHospitalById(dto.hospitalId);
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

    if (requestStatus === EmergencyRequestStatus.CANCELLED) {
      ambulance.status = AmbulanceStatus.AVAILABLE;
      ambulance.assignedAt = null;
      ambulance.reachedPatientAt = null;
      ambulance.transportStartedAt = null;
      ambulance.reachedHospitalAt = null;
      ambulance.completedAt = null;
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
