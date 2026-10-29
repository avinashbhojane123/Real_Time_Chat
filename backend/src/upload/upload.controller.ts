import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { RateLimitGuard } from '../common/guards/rate-limit.guard';

import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';

import { extname, join, basename } from 'path';
import * as fs from 'fs';

const uploadFolder = process.env.UPLOAD_DIR || 'uploads';
const uploadDir = join(process.cwd(), uploadFolder);

// Asynchronously ensure upload directory exists
void fs.promises.mkdir(uploadDir, { recursive: true }).catch((err) => {
  console.error('[UploadController] Failed to initialize upload directory:', err);
});

const maxFileSizeMB = Number(process.env.MAX_FILE_SIZE_MB || 100);

// Explicit blacklist for dangerous scripts and executables (enforced by security audit)
const blockedExtList = process.env.BLOCKED_FILE_EXTENSIONS
  ? process.env.BLOCKED_FILE_EXTENSIONS.split(',').map((e) =>
      e.trim().toLowerCase(),
    )
  : [
      '.exe',
      '.bat',
      '.cmd',
      '.vbs',
      '.com',
      '.scr',
      '.pif',
      '.msi',
      '.ps1',
      '.hta',
      '.jar',
      '.html',
      '.htm',
      '.xhtml',
      '.php',
      '.phtml',
      '.js',
      '.mjs',
      '.sh',
      '.py',
      '.pl',
      '.cgi',
      '.asp',
      '.aspx',
      '.jsp',
      '.svg',
      '.shtml',
      '.phar',
    ];

// Strict allowlist of safe media, image, and document extensions
const allowedExtensions = new Set([
  '.jpg',
  '.jpeg',
  '.png',
  '.webp',
  '.gif',
  '.bmp',
  '.ico',
  '.mp4',
  '.webm',
  '.mov',
  '.mkv',
  '.mp3',
  '.wav',
  '.ogg',
  '.m4a',
  '.aac',
  '.opus',
  '.weba',
  '.pdf',
  '.txt',
  '.doc',
  '.docx',
  '.xls',
  '.xlsx',
  '.ppt',
  '.pptx',
  '.csv',
  '.zip',
]);

/**
 * Validates known binary file signatures (magic bytes) to prevent disguised executables.
 */
async function isValidFileSignature(filePath: string, ext: string): Promise<boolean> {
  let fileHandle: fs.promises.FileHandle | null = null;
  try {
    fileHandle = await fs.promises.open(filePath, 'r');
    const buffer = Buffer.alloc(12);
    await fileHandle.read(buffer, 0, 12, 0);
    await fileHandle.close();
    fileHandle = null;

    const hex = buffer.toString('hex').toLowerCase();

    // JPEG
    if (ext === '.jpg' || ext === '.jpeg') {
      return hex.startsWith('ffd8ff');
    }
    // PNG
    if (ext === '.png') {
      return hex.startsWith('89504e47');
    }
    // GIF
    if (ext === '.gif') {
      return hex.startsWith('47494638');
    }
    // WEBP (RIFF....WEBP)
    if (ext === '.webp') {
      return hex.startsWith('52494646') && buffer.toString('ascii', 8, 12) === 'WEBP';
    }
    // PDF (%PDF)
    if (ext === '.pdf') {
      return hex.startsWith('25504446');
    }
    // ZIP / Office OpenXML (PK..)
    if (ext === '.zip' || ext === '.docx' || ext === '.xlsx' || ext === '.pptx') {
      return hex.startsWith('504b0304') || hex.startsWith('504b0506');
    }
    // MP4 / MOV (ftyp)
    if (ext === '.mp4' || ext === '.mov') {
      return buffer.toString('ascii', 4, 8) === 'ftyp';
    }
    // OGG (OggS)
    if (ext === '.ogg') {
      return hex.startsWith('4f676753');
    }

    // Pass other known document types (plain text, etc.)
    return true;
  } catch {
    return false;
  }
}

@Controller('upload')
export class UploadController {
  // Public directory listing GET /upload/files has been removed for privacy and security.

  @Post()
  @UseGuards(RateLimitGuard)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: uploadDir,

        filename: (req, file, cb) => {
          const safeExt = extname(file.originalname).toLowerCase().slice(0, 10);
          const safeBase = basename(file.originalname, safeExt)
            .replace(/[^a-zA-Z0-9_-]/g, '')
            .slice(0, 30);

          const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${safeBase ? `-${safeBase}` : ''}${safeExt}`;
          cb(null, uniqueName);
        },
      }),

      fileFilter: (req, file, cb) => {
        const rawName = file.originalname.toLowerCase();
        const ext = extname(rawName).toLowerCase();
        const parts = rawName.split('.');

        // Blacklist check (strictly blocks .html, .exe, .js, etc.)
        const hasBlockedExt = parts.some((p) =>
          blockedExtList.includes(`.${p}`),
        );
        if (hasBlockedExt || blockedExtList.includes(ext)) {
          return cb(
            new BadRequestException(
              `Executable or blocked file extension detected in filename (${file.originalname})`,
            ),
            false,
          );
        }

        // Allowlist check
        if (!allowedExtensions.has(ext)) {
          return cb(
            new BadRequestException(
              `File extension "${ext}" is not permitted for upload.`,
            ),
            false,
          );
        }

        cb(null, true);
      },

      limits: {
        fileSize: maxFileSizeMB * 1024 * 1024,
      },
    }),
  )
  async uploadFile(
    @UploadedFile()
    file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    const ext = extname(file.filename).toLowerCase();
    const isSignatureValid = await isValidFileSignature(file.path, ext);
    if (!isSignatureValid) {
      // Remove fraudulent file asynchronously
      await fs.promises.unlink(file.path).catch(() => {});
      throw new BadRequestException('File contents do not match the declared file extension');
    }

    const uploadPrefix = process.env.UPLOAD_PREFIX || '/uploads/';
    const cleanPrefix = uploadPrefix.endsWith('/')
      ? uploadPrefix
      : `${uploadPrefix}/`;
    const fileUrl = `${cleanPrefix}${file.filename}`;

    return {
      success: true,
      fileName: file.originalname,
      fileType: file.mimetype,
      fileSize: file.size,
      fileUrl,
    };
  }
}
