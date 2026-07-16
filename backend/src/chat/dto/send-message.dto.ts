import { IsString, IsNotEmpty, MaxLength, IsOptional, IsObject } from 'class-validator';

export class SendMessageDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  passcode!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
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