import { IsOptional, IsString, IsNotEmpty, IsPhoneNumber, Length } from 'class-validator';

export class UpdateAdminDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @Length(3, 100)
  username?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  password?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @Length(3, 50)
  firstName?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @Length(3, 50)
  lastName?: string;

  @IsOptional()
  @IsPhoneNumber()
  @IsNotEmpty()
  phone?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @Length(3, 255)
  address?: string;
}