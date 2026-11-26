import { IsOptional, IsString, IsUUID, Length } from 'class-validator';

export class UpdatePartyRolesDto {
  @IsUUID()
  gameId!: string;

  @IsOptional()
  @IsString()
  @Length(1, 32)
  role?: string | null;
}
