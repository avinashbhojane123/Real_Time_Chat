import { IsString, IsNotEmpty, MaxLength } from 'class-validator';

export class TypingDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  nickname!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  passcode!: string;
}
