import { IsString, IsNotEmpty, MaxLength, IsOptional, IsObject } from 'class-validator';
import { Transform } from 'class-transformer';

export class SendMessageDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  passcode!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  nickname!: string;

  @IsString()
  @IsOptional()
  @MaxLength(10000)
  message!: string;

  @IsOptional()
  @IsObject()
  replyTo?: {
    id?: number;
    nickname: string;
    message: string;
  } | null;

  @IsString()
  @IsOptional()
  fileUrl?: string | null;

  @IsString()
  @IsOptional()
  fileName?: string | null;

  @IsString()
  @IsOptional()
  fileType?: string | null;

  @IsOptional()
  fileSize?: number | string | null;

  @IsOptional()
  expiresIn?: number | null;
}