import { IsString, IsNumber } from 'class-validator';

export class CreateLessonDto {
  @IsString()
  lessonName: string;

  @IsNumber()
  groupId: number;
}