import {
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { LOCALES, type Locale } from '@bonten/shared';

const USERNAME_REGEX = /^[a-z0-9_]{3,20}$/i;

export class RegisterDto {
  @IsEmail()
  @MaxLength(254)
  email!: string;

  @IsString()
  @Matches(USERNAME_REGEX, { message: 'username_invalid' })
  username!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password!: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  displayName?: string;

  @IsOptional()
  @IsIn(LOCALES)
  locale?: Locale;
}