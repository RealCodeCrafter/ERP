import { IsNumber, IsOptional, IsString, IsPhoneNumber, Length } from 'class-validator';

export class UpdateStudentDto {
  @IsOptional()
  @IsString()
  @Length(3, 50)
  firstName?: string;

  @IsOptional()
  @IsString()
  @Length(3, 50)
  lastName?: string;

  @IsOptional()
  @IsPhoneNumber()
  phone?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  username?: string;

  @IsOptional()
  @IsString()
  password?: string;

  @IsOptional()
  @IsNumber()
  courseId?: number;
  
  @IsOptional()
  @IsNumber()
  groupId?: number;

  @IsOptional()
  @IsString()
  @Length(3, 50)
  parentsName?: string;

  @IsOptional()
  @IsPhoneNumber()
  parentPhone?: string;
}