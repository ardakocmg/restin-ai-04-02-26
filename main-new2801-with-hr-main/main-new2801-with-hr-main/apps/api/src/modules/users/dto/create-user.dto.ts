import { IsString, IsNotEmpty, IsEnum, Length } from 'class-validator';
import { UserRole } from '@prisma/client';

export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  username: string;

  @IsEnum(UserRole)
  role: UserRole;

  @IsString()
  @Length(4, 6)
  pin: string;

  @IsString()
  @IsNotEmpty()
  venueId: string;
}
