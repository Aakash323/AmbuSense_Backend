import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateHospitalDto } from './dto/create-hospital.dto';
import { UpdateHospitalDto } from './dto/update-hospital.dto';
import { Hospital, HospitalDocument } from './entities/hospital.entity';

@Injectable()
export class HospitalService {
  constructor(
    @InjectModel(Hospital.name)
    private readonly hospitalModel: Model<HospitalDocument>,
  ) {}

  async create(createHospitalDto: CreateHospitalDto) {
    const { coordinates, ...rest } = createHospitalDto;

    return this.hospitalModel.create({
      ...rest,
      location: {
        type: 'Point',
        coordinates,
      },
    });
  }

  async findAll() {
    return this.hospitalModel.find().sort({ createdAt: -1 });
  }

  async findOne(id: string) {
    const hospital = await this.hospitalModel.findById(id);

    if (!hospital) {
      throw new NotFoundException('Hospital not found');
    }

    return hospital;
  }

  async update(id: string, dto: UpdateHospitalDto) {
    const updateData: Record<string, unknown> = { ...dto };

    if (dto.coordinates) {
      updateData.location = {
        type: 'Point',
        coordinates: dto.coordinates,
      };
      delete updateData.coordinates;
    }

    const updated = await this.hospitalModel.findByIdAndUpdate(id, updateData, {
      returnDocument: 'after',
    });

    if (!updated) {
      throw new NotFoundException('Hospital not found');
    }

    return updated;
  }

  async remove(id: string) {
    const deleted = await this.hospitalModel.findByIdAndDelete(id);

    if (!deleted) {
      throw new NotFoundException('Hospital not found');
    }

    return { message: 'Hospital deleted successfully' };
  }
}
