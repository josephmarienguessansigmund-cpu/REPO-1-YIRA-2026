import { Module, Global } from '@nestjs/common';
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
import { FilieresModule } from './filieres/filieres.module';
import { PrismaService } from './prisma/prisma.service'; // Import du nouveau service

@Global() // Rend le PrismaService disponible partout sans nouvel import
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
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
    MessagerieModule,
    FilieresModule,
  ],
  controllers: [AppController],
  providers: [AppService, PrismaService], // Ajout du PrismaService ici
  exports: [PrismaService], // Export pour que les autres modules y accèdent
})
export class AppModule {}