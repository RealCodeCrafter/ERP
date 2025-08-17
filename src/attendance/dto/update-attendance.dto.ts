import { IsNotEmpty, IsNumber, IsEnum, IsArray } from 'class-validator';

export class UpdateAttendanceDto {
  @IsNotEmpty()
  @IsArray()
  attendances: { studentId: number; status: 'present' | 'absent' | 'late' }[];
}