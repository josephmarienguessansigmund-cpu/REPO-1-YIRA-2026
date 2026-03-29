import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { SigmundModule } from './sigmund/sigmund.module';
import { UssdModule } from './ussd/ussd.module';
import { SmsModule } from './sms/sms.module';
import { IaModule } from './ia/ia.module';
import { CoachModule } from './coach/coach.module';
import { AdminModule } from './admin/admin.module';
import { CarteModule } from './carte/carte.module';
import { PaymentsModule } from './payments/payments.module'; // Importation correcte ici

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
    CoachModule,
    AdminModule,
    CarteModule,
    PaymentsModule, // On l'ajoute simplement ici
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
