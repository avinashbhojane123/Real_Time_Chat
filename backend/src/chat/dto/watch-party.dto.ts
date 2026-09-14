import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsBoolean,
  IsIn,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class WatchPartyActionDto {
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  passcode!: string;

  @IsString()
  @IsNotEmpty()
  @IsIn([
    'open',
    'invite',
    'accept',
    'decline',
    'play',
    'pause',
    'seek',
    'rate',
    'change_video',
    'buffering',
    'ready',
    'close',
  ])
  action!: string;

  @IsNumber()
  @IsOptional()
  currentTime?: number;

  @IsBoolean()
  @IsOptional()
  isPlaying?: boolean;

  @IsNumber()
  @IsOptional()
  playbackRate?: number;

  @IsOptional()
  videoSource?: {
    url: string;
    title: string;
    type?: 'direct' | 'youtube';
    duration?: number;
  };

  @IsBoolean()
  @IsOptional()
  buffering?: boolean;

  @IsString()
  @IsOptional()
  reaction?: string;
}

export class GetWatchPartyDto {
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  passcode!: string;
}

export class WatchPartyReactionDto {
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  passcode!: string;

  @IsString()
  @IsNotEmpty()
  reaction!: string;
}

export class WatchPartyCommentDto {
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  passcode!: string;

  @IsString()
  @IsNotEmpty()
  text!: string;

  @IsOptional()
  @IsNumber()
  top?: number;
}
