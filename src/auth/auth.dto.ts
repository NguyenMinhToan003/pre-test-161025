import { IsEnum, IsNotEmpty } from 'class-validator';
import { ROLE_ENUM } from 'src/common/enum';

export class CreateAccountDto {
  @IsNotEmpty()
  username: string;

  @IsNotEmpty()
  @IsEnum(ROLE_ENUM)
  role: ROLE_ENUM;

  @IsNotEmpty()
  password: string;
}
export class LoginDto {
  @IsNotEmpty()
  username: string;

  @IsNotEmpty()
  password: string;
}
