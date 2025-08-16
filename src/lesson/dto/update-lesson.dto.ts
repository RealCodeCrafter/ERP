import { IsString, IsOptional } from 'class-validator';

export class UpdateLessonDto {
  @IsOptional()
  @IsString()
  lessonName?: string;
}