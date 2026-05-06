import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';
import * as fs from 'fs';
import * as path from 'path';

export interface UploadResult {
  url: string;
  publicId: string;
  width: number;
  height: number;
}

@Injectable()
export class UploadService {
  private useCloudinary: boolean;

  constructor(private configService: ConfigService) {
    const cloudName = this.configService.get('cloudinary.cloudName') || process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = this.configService.get('cloudinary.apiKey') || process.env.CLOUDINARY_API_KEY;
    const apiSecret = this.configService.get('cloudinary.apiSecret') || process.env.CLOUDINARY_API_SECRET;
    this.useCloudinary = !!(cloudName && apiKey && apiSecret);

    if (this.useCloudinary) {
      cloudinary.config({
        cloud_name: cloudName,
        api_key: apiKey,
        api_secret: apiSecret,
      });
      console.log('☁️  Using Cloudinary for image uploads');
    } else {
      console.log('📁 Using local storage for image uploads');
    }
  }

  async uploadImage(file: Express.Multer.File, folder = 'organic-store'): Promise<UploadResult> {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        'Invalid file type. Only JPEG, PNG, WebP, and GIF are allowed.',
      );
    }

    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      throw new BadRequestException('File too large. Maximum size is 5MB.');
    }

    if (this.useCloudinary) {
      try {
        return await this.uploadToCloudinary(file, folder);
      } catch (error) {
        console.error('Cloudinary upload failed, falling back to local storage:', error.message);
        return this.uploadLocal(file, folder);
      }
    }
    return this.uploadLocal(file, folder);
  }

  private async uploadToCloudinary(file: Express.Multer.File, folder: string): Promise<UploadResult> {
    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: 'image',
          transformation: [
            { width: 1200, height: 1200, crop: 'limit' },
            { quality: 'auto:good' },
            { fetch_format: 'auto' },
          ],
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (error: any, result: any) => {
          if (error) {
            reject(error);
          } else if (result) {
            resolve({
              url: result.secure_url,
              publicId: result.public_id,
              width: result.width,
              height: result.height,
            });
          } else {
            reject(new Error('Upload failed'));
          }
        },
      );

      stream.end(file.buffer);
    });
  }

  private async uploadLocal(file: Express.Multer.File, folder: string): Promise<UploadResult> {
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads', folder);
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const ext = path.extname(file.originalname || '.jpg');
    const filename = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}${ext}`;
    const filepath = path.join(uploadsDir, filename);

    fs.writeFileSync(filepath, file.buffer);

    const port = this.configService.get<number>('port') || 3001;
    const url = `http://localhost:${port}/uploads/${folder}/${filename}`;
    return {
      url,
      publicId: `${folder}/${filename}`,
      width: 0,
      height: 0,
    };
  }

  async deleteImage(publicId: string): Promise<void> {
    await cloudinary.uploader.destroy(publicId);
  }

  getOptimizedUrl(url: string, options: { width?: number; height?: number } = {}): string {
    if (!url) return url;

    const transformations: string[] = [];
    if (options.width) transformations.push(`w_${options.width}`);
    if (options.height) transformations.push(`h_${options.height}`);
    transformations.push('f_auto', 'q_auto');

    const parts = url.split('/upload/');
    if (parts.length !== 2) return url;

    return `${parts[0]}/upload/${transformations.join(',')}/${parts[1]}`;
  }
}
