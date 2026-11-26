import { IsOptional, IsString, IsUUID, Length } from 'class-validator';

export class JoinQueueDto {
  @IsUUID()
  gameId!: string;

  @IsString()
  @Length(1, 32)
  mode!: string;

  @IsString()
  @Length(2, 16)
  region!: string;

  @IsOptional()
  @IsString()
  @Length(1, 32)
  role?: string | null;
}
