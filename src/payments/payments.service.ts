import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
const FedaPay = require('fedapay');

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(private configService: ConfigService) {
    // On récupère la clé secrète depuis Railway
    const apiKey = this.configService.get<string>('FEDAPAY_SECRET_KEY');
    FedaPay.FedaPay.setApiKey(apiKey);
    FedaPay.FedaPay.setEnvironment('sandbox'); // Mettre 'live' pour la production réelle
  }

  async creerLienBilan(user: any, montant: number, niveau: string) {
    try {
      this.logger.log(`Génération FedaPay pour ${user.email} - ${montant} FCFA`);
      
      const transaction = await FedaPay.Transaction.create({
        description: `Bilan NIE YIRA - Niveau ${niveau}`,
        amount: montant,
        currency: { iso: 'XOF' },
        callback_url: 'https://yira-api-production.up.railway.app/api/v1/payments/callback',
        customer: {
          firstname: user.nom,
          lastname: 'YIRA',
          email: user.email,
          phone_number: {
            number: user.tel,
            country: 'ci'
          }
        }
      });

      const token = await transaction.generateToken();
      return { url: token.url };
    } catch (error) {
      this.logger.error(`Erreur FedaPay : ${error.message}`);
      throw error;
    }
  }
}