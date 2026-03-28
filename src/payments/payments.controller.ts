import { Controller, Post, Body, Logger } from '@nestjs/common';
import { PaymentsService } from './payments.service';

@Controller('payments')
export class PaymentsController {
  private readonly logger = new Logger(PaymentsController.name);

  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('generer-lien')
  async genererLien(@Body() body: any) {
    try {
      const { user, education_level } = body;

      // LOGIQUE DE PRIX NOHAMA CONSULTING
      let montant = 5000; // Prix par défaut (N2)
      
      if (education_level === 'N1') montant = 2000;  // Prix Social / Insertion
      if (education_level === 'N3') montant = 10000; // Prix Expert / Cadre

      this.logger.log(`Demande de lien de paiement : ${education_level} -> ${montant} FCFA`);

      // On appelle le service dynamique
      return await this.paymentsService.creerLienBilan(user, montant, education_level);
    } catch (error) {
      this.logger.error(`Erreur lors de la génération du lien : ${error.message}`);
      return { success: false, message: error.message };
    }
  }
}
