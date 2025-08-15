export class CreateSuperAdminDto {
  username: string;
  password: string;
  firstName: string;
  lastName: string;
  phone: string;
  address: string;
  smsNotificationsEnabled?: boolean;
}