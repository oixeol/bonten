import { IsString, Length } from 'class-validator';

export class JoinPartyByCodeDto {
  @IsString()
  @Length(16, 36)
  code!: string;
}
