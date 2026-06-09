import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';

import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';

@Controller('upload')
export class UploadController {
  @Post('test')
  test() {
    return {
      success: true,
    };
  }

  @Post()
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads',
        filename: (req, file, cb) => {
          const uniqueName =
            Date.now() +
            '-' +
            Math.round(Math.random() * 1e9) +
            extname(file.originalname);

          cb(null, uniqueName);
        },
      }),
      limits: {
        fileSize: 100 * 1024 * 1024,
      },
    }),
  )
  uploadFile(
    @UploadedFile() file: any,
  ) {
    if (!file) {
      throw new BadRequestException(
        'No file uploaded',
      );
    }

    return {
      success: true,
      fileName: file.originalname,
      fileType: file.mimetype,
      fileSize: file.size,

      // only return path
      fileUrl: `/api/uploads/${file.filename}`,
    };
  }
}
