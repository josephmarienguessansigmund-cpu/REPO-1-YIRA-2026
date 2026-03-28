import { Controller, Post, Body, Logger } from '@nestjs/common';
import { PaymentsService } from './payments.service';

@Controller('payments')
export class PaymentsController {
  private readonly logger = new Logger(PaymentsController.name);
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('generer-lien')
  async genererLien(@Body() body: any) {
    const { user, education_level } = body;
    let montant = 5000;
    if (education_level === 'N1') montant = 2000;
    if (education_level === 'N3') montant = 10000;
    return await this.paymentsService.creerLienBilan(user, montant, education_level);
  }
}