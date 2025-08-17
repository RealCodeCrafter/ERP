import { IsNotEmpty, IsEnum, IsNumber, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class SingleAttendanceUpdateDto {
  @IsNotEmpty()
  @IsNumber()
  studentId: number;

  @IsNotEmpty()
  @IsEnum(['present', 'absent', 'late'])
  status: 'present' | 'absent' | 'late';
}

export class UpdateAttendanceDto {
  @IsNotEmpty()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SingleAttendanceUpdateDto)
  attendances: SingleAttendanceUpdateDto[];
}
