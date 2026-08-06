import {
  Controller,
  Post,
  Get,
  Query,
  Body,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';

import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';

import { extname, join } from 'path';

import * as fs from 'fs';
import { readdirSync } from 'fs';

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
        const ext = extname(file.originalname).toLowerCase();
        const blockedExtensions = ['.exe', '.bat', '.cmd', '.vbs', '.com', '.scr', '.pif', '.msi'];
        if (blockedExtensions.includes(ext)) {
          return cb(new Error(`Executable file type (${ext}) is not allowed`), false);
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
}


