import { IsString, IsNotEmpty, IsNumber, IsOptional, MaxLength } from 'class-validator';

export class EditMessageDto {
  @IsString()
  @IsNotEmpty()
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
  passcode!: string;

  @IsNumber()
  @IsNotEmpty()
  messageId!: number;
}

export class ClearHistoryDto {
  @IsString()
  @IsNotEmpty()
  passcode!: string;
}

export class ReactToMessageDto {
  @IsString()
  @IsNotEmpty()
  passcode!: string;

  @IsNumber()
  @IsNotEmpty()
  messageId!: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  emoji!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  nickname!: string;
}
