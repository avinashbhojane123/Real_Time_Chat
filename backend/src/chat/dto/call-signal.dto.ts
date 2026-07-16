import { IsString, IsNotEmpty, IsObject, IsOptional } from 'class-validator';

export class CallUserDto {
  @IsString()
  @IsNotEmpty()
  passcode!: string;

  @IsString()
  @IsNotEmpty()
  callerName!: string;
}

export class AcceptCallDto {
  @IsString()
  @IsNotEmpty()
  passcode!: string;

  @IsString()
  @IsNotEmpty()
  receiverName!: string;
}

export class DeclineCallDto {
  @IsString()
  @IsNotEmpty()
  passcode!: string;

  @IsString()
  @IsNotEmpty()
  receiverName!: string;
}

export class WebrtcOfferDto {
  @IsString()
  @IsNotEmpty()
  passcode!: string;

  @IsNotEmpty()
  offer!: any;
}

export class WebrtcAnswerDto {
  @IsString()
  @IsNotEmpty()
  passcode!: string;

  @IsNotEmpty()
  answer!: any;
}

export class WebrtcCandidateDto {
  @IsString()
  @IsNotEmpty()
  passcode!: string;

  @IsNotEmpty()
  candidate!: any;
}

export class EndCallDto {
  @IsString()
  @IsNotEmpty()
  passcode!: string;
}
