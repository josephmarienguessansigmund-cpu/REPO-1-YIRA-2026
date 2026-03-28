import { Controller, Post, Body, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { PaymentsService } from './payments.service';

@Controller('payments')
export class PaymentsController {
  private readonly logger = new Logger(PaymentsController.name);

  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('generer-lien')
  async genererLien(@Body() body: any) {
    try {
      const { user, education_level } = body;

      // Vérification de sécurité pour éviter l'erreur FedaPay de l'image 3
      if (!user || !user.email || !education_level) {
        throw new HttpException('Données utilisateur manquantes', HttpStatus.BAD_REQUEST);
      }

      let montant = 5000;
      if (education_level === 'N1') montant = 2000;
      if (education_level === 'N3') montant = 10000;

      this.logger.log(`Création paiement : ${user.email} | Niveau: ${education_level} | Prix: ${montant} FCFA`);

      const result = await this.paymentsService.creerLienBilan(user, montant, education_level);
      return result;
    } catch (error) {
      this.logger.error(`Echec génération lien : ${error.message}`);
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}