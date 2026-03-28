import { Controller, Post, Body, Get } from '@nestjs/common'; // On ajoute "Get"
import { PaymentsService } from './payments.service';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  // Cette partie permet de tester le lien directement dans le navigateur
  @Get()
  checkHealth() {
    return { status: "OK", message: "Le module de paiement est prêt et actif" };
  }

  @Post('checkout')
  async checkout(@Body() data: any) {
    return await this.paymentsService.creerLienBilan(data);
  }
}
