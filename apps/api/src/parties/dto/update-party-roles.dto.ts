import { IsIn, IsOptional } from 'class-validator';
import { MATCHMAKING_ROLES } from '../../matchmaking/role-preferences';

export class UpdatePartyRolesDto {
  @IsOptional()
  @IsIn(MATCHMAKING_ROLES)
  primaryRole?: string | null;

  @IsOptional()
  @IsIn(MATCHMAKING_ROLES)
  secondaryRole?: string | null;
}
