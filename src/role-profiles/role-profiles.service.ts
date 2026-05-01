import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { UserRole } from '../constants/enums';
import { Admin, AdminDocument } from './entities/admin.entity';
import { Dispatcher, DispatcherDocument } from './entities/dispatcher.entity';
import { Driver, DriverDocument } from './entities/driver.entity';
import { Patient, PatientDocument } from './entities/patient.entity';

type ProfileDocument =
  | AdminDocument
  | DispatcherDocument
  | DriverDocument
  | PatientDocument;

@Injectable()
export class RoleProfilesService {
  constructor(
    @InjectModel(Admin.name) private readonly adminModel: Model<AdminDocument>,
    @InjectModel(Dispatcher.name)
    private readonly dispatcherModel: Model<DispatcherDocument>,
    @InjectModel(Driver.name)
    private readonly driverModel: Model<DriverDocument>,
    @InjectModel(Patient.name)
    private readonly patientModel: Model<PatientDocument>,
  ) {}

  async createForRole(role: UserRole, user: Types.ObjectId) {
    const model = this.getModel(role);
    const profile = await model.create({ user });
    return this.sanitize(profile);
  }

  async findByUser(role: UserRole, user: string | Types.ObjectId) {
    const profile = await this.getModel(role).findOne({ user }).exec();
    return profile ? this.sanitize(profile) : null;
  }

  async assertDriverVerified(user: string | Types.ObjectId) {
    const profile = await this.driverModel.findOne({ user }).exec();

    if (!profile) {
      throw new NotFoundException('Driver profile not found');
    }

    if (!profile.isVerified) {
      throw new ForbiddenException('Driver verification is required');
    }
  }

  async attachDriverDocument(
    user: string | Types.ObjectId,
    documentType: string,
    documentImageId: string | Types.ObjectId,
  ) {
    const profile = await this.driverModel
      .findOneAndUpdate(
        { user },
        {
          documentType,
          documentImageId,
          isVerified: false,
          verificationNote: null,
        },
        { returnDocument: 'after' },
      )
      .exec();

    if (!profile) {
      throw new NotFoundException('Driver profile not found');
    }

    return this.sanitize(profile);
  }

  async attachDriverDocumentById(
    id: string,
    documentType: string,
    documentImageId: string | Types.ObjectId,
  ) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid driver id');
    }

    const profile = await this.driverModel
      .findByIdAndUpdate(
        id,
        {
          documentType,
          documentImageId,
          isVerified: false,
          verificationNote: null,
        },
        { returnDocument: 'after' },
      )
      .exec();

    if (!profile) {
      throw new NotFoundException('Driver profile not found');
    }

    return this.sanitize(profile);
  }

  async verifyDriver(
    id: string,
    isVerified: boolean,
    verificationNote?: string,
  ) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid driver id');
    }

    const profile = await this.driverModel
      .findByIdAndUpdate(
        id,
        {
          isVerified,
          verificationNote: verificationNote ?? null,
        },
        { returnDocument: 'after' },
      )
      .exec();

    if (!profile) {
      throw new NotFoundException('Driver profile not found');
    }

    return this.sanitize(profile);
  }

  private getModel(role: UserRole): Model<ProfileDocument> {
    switch (role) {
      case UserRole.ADMIN:
        return this.adminModel;
      case UserRole.DISPATCHER:
        return this.dispatcherModel;
      case UserRole.DRIVER:
        return this.driverModel;
      case UserRole.PATIENT:
        return this.patientModel;
    }
  }

  private sanitize(profile: ProfileDocument) {
    const sanitized: Record<string, unknown> = {
      id: profile._id.toString(),
      user: profile.user.toString(),
    };

    if (profile instanceof this.driverModel) {
      sanitized.documentType = profile.documentType;
      sanitized.documentImageId = profile.documentImageId?.toString() ?? null;
      sanitized.isVerified = profile.isVerified;
      sanitized.verificationNote = profile.verificationNote;
    }

    return sanitized;
  }
}
