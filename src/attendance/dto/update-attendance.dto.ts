import { IsNotEmpty, IsEnum } from 'class-validator';

export class UpdateAttendanceDto {
  @IsNotEmpty()
  @IsEnum(['present', 'absent', 'late'])
  status: 'present' | 'absent' | 'late';
}