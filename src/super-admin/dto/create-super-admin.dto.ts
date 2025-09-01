import { IsString, IsBoolean, IsOptional } from 'class-validator';

export class CreateSuperAdminDto {
  @IsString()
  username: string;

  @IsString()
  password: string;

  @IsString()
  firstName: string; 

  @IsString()
  lastName: string;   

  @IsString()
  phone: string;

  @IsString()
  address: string;

  @IsOptional()
  @IsBoolean()
  smsNotificationsEnabled?: boolean;
}
