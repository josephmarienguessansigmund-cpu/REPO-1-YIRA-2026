import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { SigmundModule } from './sigmund/sigmund.module';
import { UssdModule } from './ussd/ussd.module';
import { SmsModule } from './sms/sms.module';
import { IaModule } from './ia/ia.module';
import { AdminModule } from './admin/admin.module';
import { CarteModule } from './carte/carte.module';
import { PaymentsModule } from './payments/payments.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    AuthModule,
    SigmundModule,
    UssdModule,
    SmsModule,
    IaModule,
    AdminModule,
    CarteModule,

@Module({
  controllers: [PaymentsController],
  providers: [PaymentsService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
// Redeploy 1774278283
