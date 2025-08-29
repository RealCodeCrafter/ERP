import { IsNotEmpty, IsOptional, IsString, Length } from 'class-validator';

export class CreateCourseDto {
  @IsString()
  @IsNotEmpty()
  @Length(3, 100)
  name: string;

  @IsOptional()
  @IsString()
  @Length(10, 500)
  description?: string;
}
