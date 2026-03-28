import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { IaModule } from './ia/ia.module';
import { PaymentsModule } from './payments/payments.module'; // <-- DOIT ÊTRE ICI
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    IaModule,
    PaymentsModule, // <-- ET DOIT ÊTRE AJOUTÉ ICI
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}