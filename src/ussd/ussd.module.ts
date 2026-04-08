import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SmsModule } from '../sms/sms.module';
import { UssdService } from './ussd.service';
import { UssdController } from './ussd.controller';
@Module({ imports: [ConfigModule, SmsModule], providers: [UssdService], controllers: [UssdController], exports: [UssdService] })
export class UssdModule {}
