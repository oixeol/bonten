import { IsString, MinLength, MaxLength, ValidateIf, IsBoolean, IsInt, Min, Max } from 'class-validator';

export class UpdateChannelDto {
  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name?: string;

  @ValidateIf((_object, value) => value !== undefined)
  @IsBoolean()
  isPrivate?: boolean;

  @ValidateIf((_object, value) => value !== undefined)
  @IsInt()
  @Min(0)
  @Max(2147483647)
  position?: number;
}