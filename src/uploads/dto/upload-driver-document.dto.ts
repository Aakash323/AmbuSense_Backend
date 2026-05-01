import { IsMongoId, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class UploadDriverDocumentDto {
  @IsString()
  @IsNotEmpty()
  documentType!: string;

  @IsOptional()
  @IsMongoId()
  driverId?: string;
}
