import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { EvaluationModule } from './evaluation/evaluation.module';
import { UssdModule } from './ussd/ussd.module';
import { SmsModule } from './sms/sms.module';
import { IaModule } from './ia/ia.module';
import { CoachModule } from './coach/coach.module';
import { AdminModule } from './admin/admin.module';
import { CarteModule } from './carte/carte.module';
import { PaymentsModule } from './payments/payments.module';
import { AffectationModule } from './affectation/affectation.module';
import { MessagerieModule } from './messagerie/messagerie.module';
import { PaysModule } from './pays/pays.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    AuthModule,
    EvaluationModule,
    UssdModule,
    SmsModule,
    IaModule,
    CoachModule,
    PaysModule,
    AdminModule,
    CarteModule,
    PaymentsModule,
    AffectationModule,
    MessagerieModule, // On l'ajoute simplement ici
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
