import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class LoginDto {
  @IsString() @IsNotEmpty() username: string;
  @IsString() @IsNotEmpty() password: string;
}

export class RegisterDto extends LoginDto {
  @IsEmail() email: string;
}

export class RefreshRequestDto {
  @IsString() @IsNotEmpty() refreshToken: string;
}

export class UpdateProfileDto {
  @IsString() @IsNotEmpty() username: string;
  @IsEmail() email: string;
  @IsOptional() @IsString() currentPassword?: string;
  @IsOptional() @IsString() newPassword?: string;
}
