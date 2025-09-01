import { IsString, IsBoolean, IsOptional } from 'class-validator';

export class CreateSuperAdminDto {
  @IsString()
  username: string;

  @IsString()
  password: string;

  @IsString()
  firstname: string;   

  @IsString()
  lastname: string; 

  @IsString()
  phone: string;

  @IsString()
  address: string;

  @IsOptional()
  @IsBoolean()
  smsnotificationsenabled?: boolean;
}
