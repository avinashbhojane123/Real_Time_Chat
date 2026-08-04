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
  viewInstagramGet(@Query('url') urlParam?: string) {
    return this.parseAndReturnInstagramView(urlParam);
  }

  @Post('instagram/view')
  viewInstagramPost(@Body('url') urlBody?: string) {
    return this.parseAndReturnInstagramView(urlBody);
  }

  private parseAndReturnInstagramView(url?: string) {
    if (!url || typeof url !== 'string') {
      throw new BadRequestException('Instagram URL parameter "url" is required.');
    }

    const trimmed = url.trim();

    // Direct match or search within pasted snippet
    const mediaMatch = trimmed.match(/(?:https?:\/\/)?(?:www\.)?(?:instagram\.com|instagr\.am)\/(?:p|reel|reels|tv)\/([a-zA-Z0-9-_]+)/i);
    if (mediaMatch && mediaMatch[1]) {
      const shortcode = mediaMatch[1];
      return {
        success: true,
        type: 'instagram',
        mediaType: 'post_or_reel',
        shortcode,
        embedUrl: `https://www.instagram.com/p/${shortcode}/embed`,
        originalUrl: `https://www.instagram.com/reel/${shortcode}/`,
        canView: true,
        message: 'Instagram media stream view URL parsed successfully without downloading file.',
      };
    }

    const profileMatch = trimmed.match(/(?:https?:\/\/)?(?:www\.)?(?:instagram\.com|instagr\.am)\/(?:@)?([a-zA-Z0-9._]+)/i);
    if (profileMatch && profileMatch[1] && !['p', 'reel', 'reels', 'tv', 'explore', 'stories'].includes(profileMatch[1].toLowerCase())) {
      const username = profileMatch[1].replace(/^@/, '');
      return {
        success: true,
        type: 'instagram',
        mediaType: 'profile',
        username,
        profileUrl: `https://www.instagram.com/${username}/`,
        embedUrl: `https://www.instagram.com/${username}/`,
        canView: true,
        message: 'Instagram profile viewer URL parsed successfully.',
      };
    }

    throw new BadRequestException('Invalid Instagram URL. Supported formats include Reels, Posts, IGTV, and Profile links.');
  }
}
