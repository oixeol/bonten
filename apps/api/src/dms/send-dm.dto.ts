import { Equals, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export class SendDmDto {
  @IsUUID()
  receiverId!: string;

  @Equals(true)
  isEncrypted!: true;

  @IsString()
  @MinLength(1)
  @MaxLength(20000)
  encryptedContent!: string;
}
