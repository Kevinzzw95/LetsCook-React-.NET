import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UploadApiResponse, v2 as cloudinary } from 'cloudinary';

@Injectable()
export class ImageService {
  private readonly configured: boolean;

  constructor(config: ConfigService) {
    const cloudName = config.get<string>('CLOUDINARY_CLOUD_NAME');
    const apiKey = config.get<string>('CLOUDINARY_API_KEY');
    const apiSecret = config.get<string>('CLOUDINARY_API_SECRET');
    this.configured = Boolean(cloudName && apiKey && apiSecret);
    if (this.configured) cloudinary.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret });
  }

  upload(file: Express.Multer.File): Promise<UploadApiResponse> {
    if (!this.configured) throw new Error('Cloudinary is not configured');
    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream({ resource_type: 'image' }, (error, result) => {
        if (error || !result) reject(error ?? new Error('Cloudinary returned no upload result'));
        else resolve(result);
      });
      stream.end(file.buffer);
    });
  }

  async delete(publicId: string): Promise<void> {
    if (!this.configured) throw new Error('Cloudinary is not configured');
    const result = await cloudinary.uploader.destroy(publicId);
    if (result.result === 'error') throw new Error(`Unable to delete Cloudinary image ${publicId}`);
  }
}
