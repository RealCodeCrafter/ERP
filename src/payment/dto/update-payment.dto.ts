import { IsNotEmpty, IsNumber, IsString, Matches } from 'class-validator';

export class UpdatePaymentDto {
  @IsNumber()
  studentId?: number;

  @IsNumber()
  groupId?: number;

  @IsNumber()
  courseId?: number;

  @IsNumber()
  amount?: number;

  @IsString()
  @Matches(/^\d{4}-\d{2}$/, { message: 'monthFor must be in YYYY-MM format' })
  monthFor?: string;
}