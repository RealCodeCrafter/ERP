import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class SmsService {
  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  async sendSMS(phone: string, message: string): Promise<void> {
    const smsApiUrl = this.configService.get<string>('SMS_API_URL');
    const smsApiToken = this.configService.get<string>('SMS_API_TOKEN');
    const smsFrom = this.configService.get<string>('SMS_FROM');

    if (!smsApiUrl || !smsApiToken) {
      throw new InternalServerErrorException('SMS API configuration is missing');
    }

    try {
      await firstValueFrom(
        this.httpService.post(
          smsApiUrl,
          {
            mobile_phone: phone,
            message,
            from: smsFrom,
          },
          {
            headers: {
              Authorization: `Bearer ${smsApiToken}`,
            },
          },
        ),
      );
    } catch (error) {
      throw new InternalServerErrorException(`Failed to send SMS: ${error.message}`);
    }
  }
}