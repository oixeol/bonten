import { IsInt, IsOptional, IsString, IsUUID, Length, Max, Min } from 'class-validator';

export class CreateLfgListingDto {
  @IsUUID()
  gameId!: string;

  @IsString()
  @Length(1, 32)
  mode!: string;

  @IsString()
  @Length(2, 16)
  region!: string;

  @IsInt()
  @Min(2)
  @Max(5)
  targetSize!: number;

  @IsOptional()
  @IsString()
  @Length(1, 32)
  desiredRole?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10000)
  minimumRating?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10000)
  maximumRating?: number;

  @IsOptional()
  @IsString()
  @Length(1, 240)
  message?: string;

  @IsOptional()
  @IsUUID()
  partyId?: string;
}
