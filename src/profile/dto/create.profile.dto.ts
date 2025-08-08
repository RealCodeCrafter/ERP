import { IsNotEmpty, IsString, IsOptional, IsPhoneNumber, IsInt, IsPositive, Length } from 'class-validator';

export class CreateProfileDto {
  @IsString()
  @IsNotEmpty()
  @Length(3, 50)
  firstName: string;

  @IsString()
  @IsNotEmpty()
  @Length(3, 50)
  lastName: string;

  @IsOptional()
  @IsString()
  photo?: string;

  @IsOptional()
  @IsString()
  username?: string;

  @IsOptional()
  @IsString()
  password?: string;

  @IsString()
  @IsNotEmpty()
  address: string;

  @IsPhoneNumber()
  @IsNotEmpty()
  phone: string;

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
}