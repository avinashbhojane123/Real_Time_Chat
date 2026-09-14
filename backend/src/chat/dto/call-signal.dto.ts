import { IsString, IsNotEmpty, IsBoolean, IsOptional } from 'class-validator';
import { Transform } from 'class-transformer';

export class CallUserDto {
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  passcode!: string;

  @IsOptional()
  @IsString()
  callerName?: string;

  @IsOptional()
  @IsString()
  from?: string;
}

export class AcceptCallDto {
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  passcode!: string;

  @IsOptional()
  @IsString()
  receiverName?: string;

  @IsOptional()
  @IsString()
  from?: string;
}

export class DeclineCallDto {
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  passcode!: string;

  @IsOptional()
  @IsString()
  receiverName?: string;

  @IsOptional()
  @IsString()
  from?: string;
}

export class WebrtcOfferDto {
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  passcode!: string;

  @IsNotEmpty()
  offer!: any;

  @IsOptional()
  @IsString()
  callerName?: string;

  @IsOptional()
  @IsString()
  from?: string;
}

export class WebrtcAnswerDto {
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  passcode!: string;

  @IsNotEmpty()
  answer!: any;

  @IsOptional()
  @IsString()
  receiverName?: string;

  @IsOptional()
  @IsString()
  from?: string;
}

export class WebrtcCandidateDto {
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  passcode!: string;

  @IsOptional()
  candidate?: any;

  @IsOptional()
  @IsString()
  from?: string;
}

export class EndCallDto {
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  passcode!: string;
}

export class TogglePipDto {
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  passcode!: string;

  @IsBoolean()
  isPip!: boolean;
}

export class ScreenShareStatusDto {
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  passcode!: string;

  @IsBoolean()
  isSharing!: boolean;
}
