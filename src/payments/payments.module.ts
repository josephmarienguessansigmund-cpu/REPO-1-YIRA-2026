import { Module } from '@nestjs/common';
import { PaymentsService } from './payments.service';

@Module({
  providers: [PaymentsService],
  exports: [PaymentsService], // Cela permet aux autres modules d'utiliser le paiement
})
export class PaymentsModule {}
