import { Module } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { FedaPayProvider } from './providers/fedapay.provider';

@Module({
  controllers: [PaymentsController],
  providers: [PaymentsService, FedaPayProvider],
  exports: [PaymentsService],
})
export class PaymentsModule {}