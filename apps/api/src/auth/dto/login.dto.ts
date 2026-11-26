import { IsString, MaxLength, MinLength } from 'class-validator';

export class LoginDto {
  /** E-mail OU nome de usuário. */
  @IsString()
  @MinLength(3)
  @MaxLength(254)
  identifier!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(128)
  password!: string;
}