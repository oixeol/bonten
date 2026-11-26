import { IsOptional, IsString, Length } from 'class-validator';

export class ApplyLfgListingDto {
  @IsOptional()
  @IsString()
  @Length(1, 32)
  role?: string;

  @IsOptional()
  @IsString()
  @Length(1, 240)
  message?: string;
}
