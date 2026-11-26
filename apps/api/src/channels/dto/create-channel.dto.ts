import { IsUUID, IsString, MinLength, MaxLength, IsEnum, ValidateIf, IsBoolean } from 'class-validator';
import { ChannelType } from '@prisma/client';

export class CreateChannelDto {
  @IsUUID()
  communityId!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name!: string;

  @IsEnum(ChannelType)
  type!: ChannelType;

  @ValidateIf((_object, value) => value !== undefined)
  @IsBoolean()
  isPrivate?: boolean;
}