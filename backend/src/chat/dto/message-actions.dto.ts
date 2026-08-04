import { IsString, IsNotEmpty, IsNumber, IsOptional, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';

export class EditMessageDto {
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  passcode!: string;

  @IsNumber()
  @IsNotEmpty()
  messageId!: number;

  @IsString()
  @IsOptional()
  @MaxLength(10000)
  newMessage?: string;

  @IsString()
  @IsOptional()
  fileUrl?: string;
}

export class DeleteMessageDto {
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  passcode!: string;

  @IsNumber()
  @IsNotEmpty()
  messageId!: number;
}

export class ClearHistoryDto {
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  passcode!: string;
}

export class ReactToMessageDto {
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  passcode!: string;

  @IsNumber()
  @IsNotEmpty()
  messageId!: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  emoji!: string;
}
