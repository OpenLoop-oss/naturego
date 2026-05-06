import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  UseGuards,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { UploadService } from './upload.service';
import { JwtAuthGuard, RolesGuard } from '../../common/guards';
import { Roles } from '../../common/decorators';

@ApiTags('Upload')
@Controller('upload')
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Post('image')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @UseInterceptors(FileInterceptor('file'))
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Upload an image' })
  @ApiResponse({ status: 200, description: 'Image uploaded successfully' })
  @ApiResponse({ status: 400, description: 'Invalid file or file too large' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async uploadImage(@UploadedFile() file: Express.Multer.File) {
    const result = await this.uploadService.uploadImage(file);
    return {
      success: true,
      message: 'Image uploaded successfully',
      data: result,
    };
  }
}
