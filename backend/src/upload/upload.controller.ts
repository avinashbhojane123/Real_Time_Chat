import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';

import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';

import { extname, join } from 'path';

import * as fs from 'fs';
import { readdirSync } from 'fs';

import { IgshareService } from '../igshare/igshare.service';

const uploadDir = join(
  process.cwd(),
  'uploads',
);

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, {
    recursive: true,
  });
}

@Controller('upload')
export class UploadController {
  constructor(private readonly igshareService: IgshareService) {}

  @Get('files')
  files() {
    return {
      files: readdirSync(uploadDir),
    };
  }

  @Post()
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: uploadDir,

        filename: (
          req,
          file,
          cb,
        ) => {
          const uniqueName =
            Date.now() +
            '-' +
            Math.round(
              Math.random() * 1e9,
            ) +
            extname(
              file.originalname,
            );

          cb(null, uniqueName);
        },
      }),

      fileFilter: (req, file, cb) => {
        const allowedExtensions = [
          // Images
          '.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp',
          // Video
          '.mp4', '.webm', '.ogg', '.mov', '.avi', '.mkv',
          // Audio
          '.mp3', '.wav', '.aac', '.m4a', '.flac',
          // PDF & Office docs
          '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
          // Text/Data
          '.txt', '.csv', '.json', '.xml',
          // Archives
          '.zip', '.tar', '.gz', '.rar', '.7z'
        ];
        const ext = extname(file.originalname).toLowerCase();
        if (!allowedExtensions.includes(ext)) {
          return cb(new BadRequestException('File type not allowed'), false);
        }
        cb(null, true);
      },

      limits: {
        fileSize:
          100 * 1024 * 1024, // 100MB
      },
    }),
  )
  uploadFile(
    @UploadedFile()
    file: any,
  ) {
    if (!file) {
      throw new BadRequestException(
        'No file uploaded',
      );
    }

    console.log(
      'Uploaded file:',
      file.filename,
    );

    console.log(
      'Saved path:',
      file.path,
    );

    const fileUrl = `/uploads/${file.filename}`;

    return {
      success: true,

      fileName:
        file.originalname,

      fileType:
        file.mimetype,

      fileSize:
        file.size,

      fileUrl,
    };
  }


  @Get('instagram/view')
  async viewInstagramGet(@Query('url') urlParam?: string) {
    return this.igshareService.resolveMediaView(urlParam);
  }

  @Post('instagram/view')
  async viewInstagramPost(@Body('url') urlBody?: string) {
    return this.igshareService.resolveMediaView(urlBody);
  }
}

