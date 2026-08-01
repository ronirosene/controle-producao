import { IsArray, IsEmail, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateUserDto {
  @IsString() @MaxLength(120) name: string;
  @IsEmail() email: string;
  @IsString() @MinLength(10) @MaxLength(128) password: string;
  @IsOptional() @IsArray() @IsString({ each: true }) features?: string[];
}

export class UpdateUserDto {
  @IsOptional() @IsString() @MaxLength(120) name?: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsString() @MinLength(10) @MaxLength(128) password?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) features?: string[];
}
