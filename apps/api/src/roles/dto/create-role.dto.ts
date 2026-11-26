import { IsUUID, IsString, MinLength, MaxLength, ValidateIf, IsArray, IsEnum } from 'class-validator';
import { RolePermission } from '@prisma/client';

export class CreateRoleDto {
  @IsUUID()
  communityId!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(50)
  name!: string;

  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @MaxLength(7)
  color?: string;

  @ValidateIf((_object, value) => value !== undefined)
  @IsArray()
  @IsEnum(RolePermission, { each: true })
  permissions?: RolePermission[];
}