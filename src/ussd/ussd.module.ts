import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { UssdService } from './ussd.service';
import { UssdController } from './ussd.controller';
@Module({ imports: [ConfigModule], providers: [UssdService], controllers: [UssdController], exports: [UssdService] })
export class UssdModule {}
