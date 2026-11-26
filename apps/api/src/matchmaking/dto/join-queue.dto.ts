import { IsIn, IsOptional, IsString, IsUUID, Length } from 'class-validator';
import { MATCHMAKING_ROLES } from '../role-preferences';

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
  @IsIn(MATCHMAKING_ROLES)
  primaryRole?: string | null;

  @IsOptional()
  @IsIn(MATCHMAKING_ROLES)
  secondaryRole?: string | null;
}
