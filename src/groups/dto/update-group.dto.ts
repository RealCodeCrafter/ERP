import {
  IsString,
  IsOptional,
  IsArray,
  IsIn,
  IsEnum,
  IsNumber,
} from 'class-validator';

export class UpdateGroupDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsNumber()
  price?: number;

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
    [
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday',
      'Sunday',
    ],
    {
      each: true,
      message: 'Each day must be a valid day of the week',
    },
  )
  daysOfWeek?: string[];

  @IsOptional()
  @IsEnum(['active', 'planned', 'completed'])
  status?: 'active' | 'planned' | 'completed';

  @IsOptional()
  @IsNumber()
  courseId?: number;

  @IsOptional()
  @IsNumber()
  teacherId?: number;

  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  studentIds?: number[];
}