import { IsString, IsNotEmpty, MaxLength } from 'class-validator';

export class GetRoomDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  passcode!: string;
}
