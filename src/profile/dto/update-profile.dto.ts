import { IsNotEmpty, IsString, IsOptional, IsPhoneNumber, IsInt, IsPositive, Length } from 'class-validator';

export class UpdateProfileDto {
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
  @IsString()
  photo?: string;

  @IsOptional()
  @IsString()
  username?: string;

  @IsOptional()
  @IsString()
  password?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  address?: string;

  @IsOptional()
  @IsPhoneNumber()
  phone?: string;

  @IsOptional()
  @IsString()
  @Length(3, 50)
  parentsName?: string;

  @IsOptional()
  @IsPhoneNumber()
  parentPhone?: string;

  @IsOptional()
  @IsInt()
  @IsPositive()
  studentId?: number;

  @IsOptional()
  @IsInt()
  @IsPositive()
  adminId?: number;

  @IsOptional()
  @IsInt()
  @IsPositive()
  teacherId?: number;

  @IsOptional()
  @IsInt()
  @IsPositive()
  superAdminId?: number;
}