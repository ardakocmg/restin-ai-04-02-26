import { IsString, IsNotEmpty, Length } from 'class-validator';

export class LoginPinDto {
  @IsString()
  @IsNotEmpty()
  username: string;

  @IsString()
  @IsNotEmpty()
  @Length(4, 6)
  pin: string;
}
