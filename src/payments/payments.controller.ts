import { Controller, Post, Body } from '@nestjs/common';
import { PaymentsService } from './payments.service';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('checkout')
  async checkout(@Body() data: { nom: string; email: string; tel: string }) {
    // Cette route sera appelée par votre bouton "Payer" sur orientations.yira-ci.com
    // Elle envoie les infos du jeune (nom, email, tel) à FedaPay
    return await this.paymentsService.creerLienBilan(data);
  }
}
