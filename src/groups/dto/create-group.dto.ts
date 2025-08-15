import { IsString, IsNumber, IsArray, IsOptional } from 'class-validator';

export class CreateGroupDto {
  @IsString()
  name: string;

  @IsNumber()
  courseId: number;

  @IsOptional()
  @IsNumber()
  teacherId?: number;

  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  students?: number[];
}
