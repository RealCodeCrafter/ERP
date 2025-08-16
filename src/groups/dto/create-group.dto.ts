import { IsString, IsNumber, IsArray, IsOptional, IsIn } from 'class-validator';

export class CreateGroupDto {
  @IsString()
  name: string;

  @IsNumber()
  courseId: number;

  @IsNumber()
  price: number;

  @IsOptional()
  @IsNumber()
  teacherId?: number;

  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  students?: number[];

  @IsOptional()
  @IsString()
  startTime?: string;

  @IsOptional()
  @IsString()
  endTime?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @IsIn(
    ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
    { each: true, message: 'Each day must be a valid day of the week' },
  )
  daysOfWeek?: string[];
}