import { IsString, IsNotEmpty, MaxLength, IsOptional } from 'class-validator';

export class JoinRoomDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  nickname!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  passcode!: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  deviceType?: string;

  @IsString()
  @IsOptional()
  @MaxLength(150)
  deviceModel?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  browser?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  os?: string;
}