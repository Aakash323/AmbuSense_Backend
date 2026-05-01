import {
  BadRequestException,
  Body,
  Controller,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { randomUUID } from 'crypto';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { UserRole } from '../constants/enums';
import type { UserDocument } from '../users/entities/user.entity';
import { UploadDriverDocumentDto } from './dto/upload-driver-document.dto';
import { UploadsService } from './uploads.service';

const allowedImageMimeTypes = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
]);

@Controller('uploads')
@UseGuards(AuthGuard, RolesGuard)
export class UploadsController {
  constructor(private readonly uploadsService: UploadsService) {}

  @Post('driver-document')
  @Roles(UserRole.DRIVER, UserRole.ADMIN)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: join(process.cwd(), 'uploads', 'documents'),
        filename: (_req, file, callback) => {
          const extension = extname(file.originalname).toLowerCase();
          callback(null, `${Date.now()}-${randomUUID()}${extension}`);
        },
      }) as never,
      fileFilter: (_req, file, callback) => {
        if (!allowedImageMimeTypes.has(file.mimetype)) {
          callback(
            new BadRequestException(
              'Only JPEG, PNG, and WebP images are allowed',
            ),
            false,
          );
          return;
        }

        callback(null, true);
      },
    }),
  )
  uploadDriverDocument(
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body() dto: UploadDriverDocumentDto,
    @CurrentUser() user: UserDocument,
  ) {
    return this.uploadsService.uploadDriverDocument(file, dto, user);
  }
}
