import { IsNotEmpty, IsNumber, IsEnum, IsArray } from 'class-validator';

export class CreateAttendanceDto {
  @IsNotEmpty()
  @IsNumber()
  lessonId: number;

  @IsNotEmpty()
  @IsArray()
  attendances: { studentId: number; status: 'present' | 'absent' | 'late' }[];
}

export class UpdateAttendanceDto {
  @IsEnum(['present', 'absent', 'late'])
  status?: string;
}